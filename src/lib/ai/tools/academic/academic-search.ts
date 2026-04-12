import { tool as createTool } from "ai";
import { JSONSchema7 } from "json-schema";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";
import { safe } from "ts-safe";

// OpenAlex API types
interface OpenAlexAuthor {
  author: {
    display_name: string;
  };
}

interface OpenAlexWork {
  id: string;
  title: string;
  authorships: OpenAlexAuthor[];
  publication_year: number | null;
  cited_by_count: number;
  doi: string | null;
  abstract_inverted_index: Record<string, number[]> | null;
}

interface OpenAlexResponse {
  meta: { count: number };
  results: OpenAlexWork[];
}

export interface AcademicSearchResult {
  title: string;
  authors: string[];
  year: number | null;
  citationCount: number;
  abstract: string | null;
  url: string;
  doi: string | null;
}

function reconstructAbstract(
  invertedIndex: Record<string, number[]> | null,
): string | null {
  if (!invertedIndex) return null;
  const words: [string, number][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([word, pos]);
    }
  }
  words.sort((a, b) => a[1] - b[1]);
  return words.map(([w]) => w).join(" ");
}

export const academicSearchSchema: JSONSchema7 = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "Search query for academic papers",
    },
    limit: {
      type: "number",
      description: "Number of results to return (default 5, max 10)",
      default: 5,
      minimum: 1,
      maximum: 10,
    },
    year: {
      type: "string",
      description:
        "Filter by publication year or range (e.g. '2024' or '2020-2024')",
    },
  },
  required: ["query"],
};

export const academicSearchTool = createTool({
  description:
    "Search academic papers using OpenAlex. Returns paper titles, abstracts, authors, publication year, and citation counts. Use this when users ask about research papers, scientific studies, or academic topics.",
  inputSchema: jsonSchemaToZod(academicSearchSchema),
  execute: (params) => {
    return safe(async () => {
      const query = encodeURIComponent(params.query);
      const limit = params.limit || 5;

      let url = `https://api.openalex.org/works?search=${query}&per_page=${limit}&select=id,title,authorships,publication_year,cited_by_count,doi,abstract_inverted_index`;

      if (params.year) {
        const yearFilter = params.year.includes("-")
          ? `publication_year:${params.year.replace("-", ",")}`
          : `publication_year:${params.year}`;
        url += `&filter=${yearFilter}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(
          `OpenAlex API error: ${response.status} ${response.statusText}`,
        );
      }

      const result = (await response.json()) as OpenAlexResponse;

      return {
        total: result.meta.count,
        results: (result.results || []).map(
          (work): AcademicSearchResult => ({
            title: work.title,
            authors: work.authorships?.map((a) => a.author.display_name) || [],
            year: work.publication_year,
            citationCount: work.cited_by_count,
            abstract: reconstructAbstract(work.abstract_inverted_index),
            url: work.id.replace(
              "https://openalex.org/",
              "https://openalex.org/works/",
            ),
            doi: work.doi,
          }),
        ),
        guide: `Use the academic search results to answer the user's question. Summarize key findings, cite relevant papers, and ask if they want more details on any specific paper.`,
      };
    })
      .ifFail((e) => {
        return {
          isError: true,
          error: e.message,
          solution:
            "An academic search error occurred. Explain the error to the user and provide information from your existing knowledge about the topic.",
        };
      })
      .unwrap();
  },
});
