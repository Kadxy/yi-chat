"use client";

import { BackgroundPaths } from "@/components/ui/background-paths";
import { Button } from "ui/button";
import { RotateCw } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="relative w-full h-dvh overflow-hidden">
      <BackgroundPaths />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-8xl sm:text-9xl font-bold tracking-tighter text-foreground/10">
            500
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Something went wrong.
          </p>
          <Button variant="outline" size="lg" className="mt-6" onClick={reset}>
            <RotateCw />
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
