import { tool as createTool } from "ai";
import { z } from "zod";
import { serverFileStorage } from "lib/file-storage";
import { getContentTypeFromFilename } from "lib/file-storage/storage-utils";

function withCharset(contentType: string): string {
  if (
    contentType.startsWith("text/") ||
    contentType === "application/json" ||
    contentType === "application/xml" ||
    contentType === "application/javascript"
  ) {
    return `${contentType}; charset=utf-8`;
  }
  return contentType;
}

export const createUserFileTool = createTool({
  description:
    "Create a file and return a download URL for the user. " +
    "Use this when the user asks you to generate a file (e.g. code, CSV, config, document) " +
    "that they can download. Provide the full file content as a string. " +
    "IMPORTANT: After the tool returns successfully, you MUST present the download URL " +
    "to the user as a markdown link, like: [filename](url)",
  inputSchema: z.object({
    filename: z
      .string()
      .describe(
        "The filename including extension (e.g. 'report.csv', 'script.py', 'config.yaml')",
      ),
    content: z.string().describe("The full text content of the file to create"),
  }),
  execute: async ({ filename, content }) => {
    try {
      const contentType = withCharset(getContentTypeFromFilename(filename));
      const buffer = Buffer.from(content, "utf-8");

      const { sourceUrl } = await serverFileStorage.upload(buffer, {
        filename,
        contentType,
      });

      return {
        filename,
        url: sourceUrl,
        size: buffer.byteLength,
      };
    } catch (error: any) {
      return {
        isError: true,
        error: `Failed to create file: ${error.message}`,
      };
    }
  },
});
