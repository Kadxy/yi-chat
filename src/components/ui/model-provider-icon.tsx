import { BlendIcon } from "lucide-react";
import { ClaudeIcon } from "./claude-icon";

export function ModelProviderIcon({
  provider,
  className,
}: { provider: string; className?: string }) {
  return provider === "anthropic" ? (
    <ClaudeIcon className={className} />
  ) : (
    <BlendIcon className={className} />
  );
}
