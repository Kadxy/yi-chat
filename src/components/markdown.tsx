"use client";

import { memo } from "react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { cjk } from "@streamdown/cjk";
import { isJson } from "lib/utils";
import JsonView from "ui/json-view";

const plugins = { code, math, mermaid, cjk };

const NonMemoizedMarkdown = ({
  children,
  isAnimating,
}: {
  children: string;
  isAnimating?: boolean;
}) => {
  if (isJson(children)) {
    return (
      <article className="w-full h-full relative">
        <JsonView data={children} />
      </article>
    );
  }

  return (
    <Streamdown
      className="max-w-none"
      plugins={plugins}
      isAnimating={isAnimating}
      linkSafety={{ enabled: false }}
    >
      {children}
    </Streamdown>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.isAnimating === nextProps.isAnimating,
);
