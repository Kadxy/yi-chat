import { tool as createTool } from "ai";
import { z } from "zod";
import { getFileStorage } from "lib/file-storage";
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

function isNotebookFile(filename: string): boolean {
  return getExtension(filename) === "ipynb";
}

const BINARY_CHECK_SIZE = 8192;

/**
 * Sniff the first 8KB of a buffer to determine if it's binary.
 * - null byte (0x00) → binary immediately
 * - non-printable chars (< 32, excluding tab/LF/CR) > 10% → binary
 */
function isBinaryContent(buffer: Buffer): boolean {
  const checkSize = Math.min(buffer.length, BINARY_CHECK_SIZE);
  let nonPrintable = 0;
  for (let i = 0; i < checkSize; i++) {
    const byte = buffer[i];
    if (byte === 0) return true;
    if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
      nonPrintable++;
    }
  }
  return checkSize > 0 && nonPrintable / checkSize > 0.1;
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
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheets: string[] = [];
  workbook.eachSheet((sheet) => {
    const rows: string[] = [];
    sheet.eachRow((row) => {
      const values = row.values as (
        | string
        | number
        | boolean
        | null
        | undefined
      )[];
      // row.values is 1-indexed, first element is undefined
      rows.push(
        values
          .slice(1)
          .map((v) => (v == null ? "" : String(v)))
          .join(","),
      );
    });
    sheets.push(`--- Sheet: ${sheet.name} ---\n${rows.join("\n")}`);
  });
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

interface NotebookCell {
  cell_type: string;
  source: string[] | string;
  outputs?: Array<{
    output_type: string;
    text?: string[] | string;
    data?: Record<string, string[] | string>;
    ename?: string;
    evalue?: string;
    traceback?: string[];
  }>;
}

function parseNotebook(
  raw: string,
  name: string,
  offset?: number,
  limit?: number,
) {
  let notebook: { cells?: NotebookCell[] };
  try {
    notebook = JSON.parse(raw);
  } catch {
    return { isError: true, error: "Invalid notebook JSON." };
  }

  const cells = notebook.cells ?? [];
  const parts: string[] = [];

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const src = Array.isArray(cell.source)
      ? cell.source.join("")
      : (cell.source ?? "");
    const header = `--- Cell ${i + 1} [${cell.cell_type}] ---`;
    let block = `${header}\n${src}`;

    if (cell.cell_type === "code" && cell.outputs?.length) {
      const outputTexts: string[] = [];
      for (const out of cell.outputs) {
        if (
          out.output_type === "stream" ||
          out.output_type === "execute_result" ||
          out.output_type === "display_data"
        ) {
          const t = out.text ?? out.data?.["text/plain"];
          if (t) outputTexts.push(Array.isArray(t) ? t.join("") : t);
        } else if (out.output_type === "error") {
          outputTexts.push(`${out.ename}: ${out.evalue}`);
        }
      }
      if (outputTexts.length) {
        block += `\n\n[Output]\n${outputTexts.join("\n")}`;
      }
    }

    parts.push(block);
  }

  const content = parts.join("\n\n");
  const lines = splitLines(content);

  if (
    offset !== undefined ||
    limit !== undefined ||
    content.length > MAX_CONTENT_LENGTH
  ) {
    return formatLinesOutput(lines, name, "ipynb (notebook)", offset, limit);
  }

  return {
    filename: name,
    format: "ipynb (notebook)",
    totalCells: cells.length,
    totalLines: lines.length,
    content: lines.map((line, i) => `${i + 1}\t${line}`).join("\n"),
  };
}

export const readUserFileTool = createTool({
  description:
    "Read the content of a user-uploaded file. Supports text-based files (code, markdown, JSON, CSV, config files, etc.), document formats (DOCX, XLSX/XLS), and Jupyter Notebooks (.ipynb). " +
    "Files with unknown extensions are auto-detected via content sniffing. " +
    "DOCX files are converted to plain text. XLSX/XLS files are converted to CSV format with sheet names. " +
    "Notebook files show cells with their type, source, and outputs. " +
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
        const buffer = await getFileStorage().download(key);
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

      // Handle Jupyter Notebook (.ipynb)
      if (isNotebookFile(name)) {
        const buffer = await getFileStorage().download(key);
        const text = buffer.toString("utf-8");
        return parseNotebook(text, name, offset, limit);
      }

      const buffer = await getFileStorage().download(key);

      // Known text extension → skip sniffing; unknown extension → sniff content
      if (!isTextFile(name)) {
        if (isBinaryContent(buffer)) {
          return {
            isError: true,
            error: `Cannot read binary file: ${name}. Only text-based files are supported.`,
          };
        }
      }

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
