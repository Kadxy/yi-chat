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

function isTextFile(filename: string, mimeType?: string): boolean {
  if (mimeType?.startsWith("text/")) return true;
  if (mimeType === "application/json" || mimeType === "application/xml")
    return true;
  const ext = getExtension(filename);
  return TEXT_EXTENSIONS.has(ext);
}

function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

export const readUserFileTool = createTool({
  description:
    "Read the content of a user-uploaded file. Supports text-based files (code, markdown, JSON, CSV, config files, etc.). " +
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
