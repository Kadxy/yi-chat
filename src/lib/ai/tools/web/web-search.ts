import { tool as createTool } from "ai";
import { JSONSchema7 } from "json-schema";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";
import { safe } from "ts-safe";

// Jina API Types
export interface JinaSearchResult {
  title: string;
  url: string;
  description: string;
  content: string;
}

export interface JinaSearchResponse {
  code: number;
  data: JinaSearchResult[];
}

export interface JinaReaderResponse {
  code: number;
  data: {
    title: string;
    url: string;
    content: string;
  };
}

export const jinaSearchSchema: JSONSchema7 = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "Search query",
    },
    numResults: {
      type: "number",
      description: "Number of search results to return",
      default: 5,
      minimum: 1,
      maximum: 10,
    },
  },
  required: ["query"],
};

export const jinaContentsSchema: JSONSchema7 = {
  type: "object",
  properties: {
    url: {
      type: "string",
      description: "The URL to extract content from",
    },
  },
  required: ["url"],
};

const API_KEYS = (process.env.JINA_API_KEY || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);
const SEARCH_URL = "https://s.jina.ai";
const READER_URL = "https://r.jina.ai";

const getRandomKey = () => {
  if (API_KEYS.length === 0) {
    throw new Error("JINA_API_KEY is not configured");
  }
  return API_KEYS[Math.floor(Math.random() * API_KEYS.length)];
};

const buildHeaders = (
  extra?: Record<string, string>,
): Record<string, string> => {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${getRandomKey()}`,
    ...extra,
  };
};

export const jinaSearchTool = createTool({
  description:
    "Search the web using Jina AI - performs real-time web searches and returns high-quality, relevant results with full content extraction optimized for LLMs.",
  inputSchema: jsonSchemaToZod(jinaSearchSchema),
  execute: (params) => {
    return safe(async () => {
      const query = encodeURIComponent(params.query);
      const num = params.numResults || 5;

      const response = await fetch(`${SEARCH_URL}/${query}`, {
        method: "GET",
        headers: buildHeaders({
          "X-Retain-Images": "none",
        }),
      });

      if (response.status === 429) {
        throw new Error(
          "Jina API rate limit exceeded. Consider setting JINA_API_KEY for higher limits.",
        );
      }

      if (!response.ok) {
        throw new Error(
          `Jina Search API error: ${response.status} ${response.statusText}`,
        );
      }

      const result = (await response.json()) as JinaSearchResponse;

      return {
        results: (result.data || []).slice(0, num).map((item) => ({
          title: item.title,
          url: item.url,
          description: item.description,
          content: item.content,
        })),
        guide: `Use the search results to answer the user's question. Summarize the content and ask if they have any additional questions about the topic.`,
      };
    })
      .ifFail((e) => {
        return {
          isError: true,
          error: e.message,
          solution:
            "A web search error occurred. First, explain to the user what caused this specific error and how they can resolve it. Then provide helpful information based on your existing knowledge to answer their question.",
        };
      })
      .unwrap();
  },
});

export const jinaContentsTool = createTool({
  description:
    "Extract detailed content from a specific URL using Jina Reader - converts any web page into clean, LLM-friendly markdown text with full content extraction.",
  inputSchema: jsonSchemaToZod(jinaContentsSchema),
  execute: async (params) => {
    return safe(async () => {
      const response = await fetch(`${READER_URL}/${params.url}`, {
        method: "GET",
        headers: buildHeaders(),
      });

      if (response.status === 429) {
        throw new Error(
          "Jina API rate limit exceeded. Consider setting JINA_API_KEY for higher limits.",
        );
      }

      if (!response.ok) {
        throw new Error(
          `Jina Reader API error: ${response.status} ${response.statusText}`,
        );
      }

      const result = (await response.json()) as JinaReaderResponse;

      return {
        title: result.data?.title,
        url: result.data?.url,
        content: result.data?.content,
      };
    })
      .ifFail((e) => {
        return {
          isError: true,
          error: e.message,
          solution:
            "A web content extraction error occurred. First, explain to the user what caused this specific error and how they can resolve it. Then provide helpful information based on your existing knowledge to answer their question.",
        };
      })
      .unwrap();
  },
});
