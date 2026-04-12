import { tool as createTool } from "ai";
import { z } from "zod";
import { serverFileStorage } from "lib/file-storage";
import { storageKeyFromUrl } from "lib/file-storage/storage-utils";

const MAX_CONTENT_LENGTH = 200_000; // ~200KB text limit

const TEXT_EXTENSIONS = new Set([
  // Plain text
  "txt",
  "text",
  "log",
  "csv",
  "tsv",
  // Markup / data
  "md",
  "markdown",
  "json",
  "jsonl",
  "xml",
  "yaml",
  "yml",
  "toml",
  "ini",
  "cfg",
  "conf",
  "env",
  "properties",
  // Web
  "html",
  "htm",
  "css",
  "scss",
  "sass",
  "less",
  "svg",
  // JavaScript / TypeScript
  "js",
  "jsx",
  "ts",
  "tsx",
  "mjs",
  "cjs",
  "vue",
  "svelte",
  // Other languages
  "py",
  "pyw",
  "rb",
  "java",
  "kt",
  "kts",
  "scala",
  "go",
  "rs",
  "c",
  "h",
  "cpp",
  "cc",
  "cxx",
  "hpp",
  "cs",
  "swift",
  "m",
  "mm",
  "php",
  "pl",
  "pm",
  "r",
  "R",
  "lua",
  "sh",
  "bash",
  "zsh",
  "fish",
  "bat",
  "cmd",
  "ps1",
  "psm1",
  // Data / query
  "sql",
  "graphql",
  "gql",
  "prisma",
  // Config / CI
  "dockerfile",
  "makefile",
  "cmake",
  "gradle",
  "tf",
  "tfvars",
  // Docs
  "rst",
  "tex",
  "bib",
  "org",
  "adoc",
  "asciidoc",
]);

function getExtension(filename: string): string {
  const base = filename.split("/").pop() || filename;
  // Handle dotfiles like "Dockerfile", "Makefile"
  const lower = base.toLowerCase();
  if (
    lower === "dockerfile" ||
    lower === "makefile" ||
    lower === "cmakelists.txt"
  ) {
    return lower.replace(".txt", "");
  }
  const dot = base.lastIndexOf(".");
  if (dot === -1) return "";
  return base.slice(dot + 1).toLowerCase();
}

const BINARY_DOC_EXTENSIONS = new Set(["docx", "xlsx", "xls"]);

function isTextFile(filename: string, mimeType?: string): boolean {
  if (mimeType?.startsWith("text/")) return true;
  if (mimeType === "application/json" || mimeType === "application/xml")
    return true;
  const ext = getExtension(filename);
  return TEXT_EXTENSIONS.has(ext);
}

function isBinaryDoc(filename: string): boolean {
  return BINARY_DOC_EXTENSIONS.has(getExtension(filename));
}

function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function parseXlsx(buffer: Buffer): Promise<string> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheets: string[] = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    sheets.push(`--- Sheet: ${name} ---\n${csv}`);
  }
  return sheets.join("\n\n");
}

function formatLinesOutput(
  lines: string[],
  name: string,
  format: string | undefined,
  offset?: number,
  limit?: number,
) {
  const startLine = offset ?? 0;
  const lineLimit = limit ?? 500;
  const endLine = Math.min(startLine + lineLimit, lines.length);
  const slice = lines.slice(startLine, endLine);

  return {
    filename: name,
    ...(format && { format }),
    totalLines: lines.length,
    readRange: { start: startLine, end: endLine },
    hasMore: endLine < lines.length,
    content: slice.map((line, i) => `${startLine + i + 1}\t${line}`).join("\n"),
  };
}

export const readUserFileTool = createTool({
  description:
    "Read the content of a user-uploaded file. Supports text-based files (code, markdown, JSON, CSV, config files, etc.) and document formats (DOCX, XLSX/XLS). " +
    "DOCX files are converted to plain text. XLSX/XLS files are converted to CSV format with sheet names. " +
    "Use offset and limit to read specific line ranges for large files. " +
    "Call without offset/limit first to see file info and the beginning of the content.",
  inputSchema: z.object({
    url: z
      .string()
      .describe(
        "The URL of the uploaded file (from the attachment info in the conversation)",
      ),
    filename: z
      .string()
      .optional()
      .describe("Original filename, used to detect file type"),
    offset: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        "Start reading from this line number (0-based). Omit to start from the beginning.",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(2000)
      .optional()
      .describe(
        "Maximum number of lines to return. Defaults to 500. Max 2000.",
      ),
  }),
  execute: async ({ url, filename, offset, limit }) => {
    try {
      const key = storageKeyFromUrl(url);
      if (!key) {
        return { isError: true, error: "Invalid file URL" };
      }

      const name = filename || key.split("/").pop() || "unknown";

      // Handle binary document formats (DOCX, XLSX, XLS)
      if (isBinaryDoc(name)) {
        const buffer = await serverFileStorage.download(key);
        const ext = getExtension(name);
        let text: string;
        let format: string;

        if (ext === "docx") {
          text = await parseDocx(buffer);
          format = "docx (converted to text)";
        } else {
          text = await parseXlsx(buffer);
          format = "xlsx (converted to CSV)";
        }

        const lines = splitLines(text);
        if (
          offset !== undefined ||
          limit !== undefined ||
          text.length > MAX_CONTENT_LENGTH
        ) {
          return formatLinesOutput(lines, name, format, offset, limit);
        }

        return {
          filename: name,
          format,
          totalLines: lines.length,
          content: lines.map((line, i) => `${i + 1}\t${line}`).join("\n"),
        };
      }

      if (!isTextFile(name)) {
        return {
          isError: true,
          error: `Cannot read binary file: ${name}. Only text-based files (code, markdown, JSON, CSV, config, etc.) are supported.`,
        };
      }

      const buffer = await serverFileStorage.download(key);
      const text = buffer.toString("utf-8");

      if (text.length > MAX_CONTENT_LENGTH) {
        // File is very large, enforce line-based reading
        const lines = splitLines(text);
        const startLine = offset ?? 0;
        const lineLimit = limit ?? 500;
        const endLine = Math.min(startLine + lineLimit, lines.length);
        const slice = lines.slice(startLine, endLine);

        return {
          filename: name,
          totalLines: lines.length,
          readRange: { start: startLine, end: endLine },
          hasMore: endLine < lines.length,
          content: slice
            .map((line, i) => `${startLine + i + 1}\t${line}`)
            .join("\n"),
        };
      }

      // File fits in limit
      const lines = splitLines(text);
      if (offset !== undefined || limit !== undefined) {
        const startLine = offset ?? 0;
        const lineLimit = limit ?? 500;
        const endLine = Math.min(startLine + lineLimit, lines.length);
        const slice = lines.slice(startLine, endLine);

        return {
          filename: name,
          totalLines: lines.length,
          readRange: { start: startLine, end: endLine },
          hasMore: endLine < lines.length,
          content: slice
            .map((line, i) => `${startLine + i + 1}\t${line}`)
            .join("\n"),
        };
      }

      // Return full content with line numbers
      return {
        filename: name,
        totalLines: lines.length,
        content: lines.map((line, i) => `${i + 1}\t${line}`).join("\n"),
      };
    } catch (error: any) {
      if (error?.name === "FileNotFoundError") {
        return {
          isError: true,
          error: "File not found. It may have been deleted.",
        };
      }
      return { isError: true, error: `Failed to read file: ${error.message}` };
    }
  },
});
