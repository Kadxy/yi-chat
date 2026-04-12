"use client";

import { ToolUIPart } from "ai";
import equal from "lib/equal";
import { toAny, truncateString } from "lib/utils";
import { motion } from "framer-motion";
import { AlertTriangleIcon, GraduationCapIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo, useMemo } from "react";
import { Skeleton } from "ui/skeleton";
import { TextShimmer } from "ui/text-shimmer";

interface AcademicResult {
  title: string;
  authors: string[];
  year: number | null;
  citationCount: number | null;
  abstract: string | null;
  url: string;
  doi: string | null;
}

interface AcademicToolResult {
  total?: number;
  results?: AcademicResult[];
  isError?: boolean;
  error?: string;
}

interface AcademicSearchToolInvocationProps {
  part: ToolUIPart;
}

function AcademicResultsList({ results }: { results: AcademicResult[] }) {
  return (
    <div className="flex flex-col gap-2 pb-4">
      {results.map((paper, i) => (
        <a
          href={paper.doi ? `https://doi.org/${paper.doi}` : paper.url}
          key={i}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
        >
          <div className="size-9 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <GraduationCapIcon className="size-4 text-purple-500" />
          </div>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <span className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {paper.title}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                {paper.authors.slice(0, 3).join(", ")}
                {paper.authors.length > 3 && " et al."}
              </span>
              {paper.year && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {paper.year}
                </span>
              )}
              {paper.citationCount != null && (
                <span className="text-[10px] text-muted-foreground/70">
                  {paper.citationCount.toLocaleString()} citations
                </span>
              )}
            </div>
            {paper.abstract && (
              <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                {paper.abstract}
              </p>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}

function BrowserShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-background/50 mx-12">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
        <div className="flex gap-1.5">
          <div className="size-2 rounded-full bg-muted-foreground/20" />
          <div className="size-2 rounded-full bg-muted-foreground/20" />
          <div className="size-2 rounded-full bg-muted-foreground/20" />
        </div>
      </div>
      {children}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="relative h-[160px] overflow-hidden p-3">
      <div className="absolute inset-x-0 top-0 z-10 h-4 bg-linear-to-b from-background/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-10 h-12 bg-linear-to-t from-background/50 to-transparent" />
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: "-50%" }}
        transition={{
          duration: 5,
          ease: "linear",
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "loop",
        }}
        className="flex flex-col"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-3 mb-4">
            <Skeleton className="size-9 rounded-md shrink-0" />
            <div className="flex flex-col gap-2 flex-1 pt-1">
              <Skeleton className="h-3 w-4/5 rounded-full" />
              <Skeleton className="h-2 w-2/3 rounded-full" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function PureAcademicSearchToolInvocation({
  part,
}: AcademicSearchToolInvocationProps) {
  const t = useTranslations();

  const result = useMemo(() => {
    if (!part.state.startsWith("output")) return null;
    return part.output as AcademicToolResult;
  }, [part.state]);

  const query = useMemo(() => {
    return (part.input as { query?: string })?.query;
  }, [part.input]);

  if (!part.state.startsWith("output"))
    return (
      <div className="flex flex-col gap-3 min-w-[300px] w-full fade-300">
        <div className="flex items-center text-muted-foreground gap-2 text-sm">
          <SearchIcon className="size-3 wiggle" />
          <TextShimmer>
            {query?.length
              ? `"${truncateString(query, 30)}" ${t("Chat.Tool.academicSearching")}`
              : t("Chat.Tool.academicSearching")}
          </TextShimmer>
        </div>
        <BrowserShell>
          <LoadingSkeleton />
        </BrowserShell>
      </div>
    );

  return (
    <div className="flex flex-col gap-3 min-w-[300px] w-full fade-300">
      <div className="flex items-center text-muted-foreground gap-2 text-sm">
        <GraduationCapIcon className="size-3" />
        <span className="text-muted-foreground">
          {query?.length
            ? `"${truncateString(query, 30)}" ${t("Chat.Tool.searchedAcademic")}`
            : t("Chat.Tool.searchedAcademic")}
        </span>
      </div>

      <BrowserShell>
        <div className="relative">
          <div className="absolute inset-x-0 bottom-0 z-10 h-12 bg-linear-to-t from-background/80 to-transparent pointer-events-none rounded-b-xl" />
          <div className="p-3 flex flex-col gap-4 max-h-[400px] overflow-y-auto scrollbar-hide">
            <div className="flex flex-col gap-2 pb-4">
              {part.errorText ? (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangleIcon className="size-3.5" />
                  {t("Chat.Tool.academicSearchError")}
                </p>
              ) : (
                <AcademicResultsList results={result?.results || []} />
              )}
            </div>
          </div>
        </div>
      </BrowserShell>
    </div>
  );
}

function areEqual(
  { part: prevPart }: AcademicSearchToolInvocationProps,
  { part: nextPart }: AcademicSearchToolInvocationProps,
) {
  if (prevPart.state != nextPart.state) return false;
  if (!equal(prevPart.input, nextPart.input)) return false;
  if (
    prevPart.state.startsWith("output") &&
    !equal(prevPart.output, toAny(nextPart).output)
  )
    return false;
  return true;
}

export const AcademicSearchToolInvocation = memo(
  PureAcademicSearchToolInvocation,
  areEqual,
);
