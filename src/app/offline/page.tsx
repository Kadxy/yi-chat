"use client";

import { Button } from "ui/button";
import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="relative w-full h-dvh overflow-hidden bg-background">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-center">
          <WifiOff className="size-16 text-muted-foreground/30" />
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter text-foreground/80 mt-4">
            Offline
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            You are currently offline. Please check your internet connection.
          </p>
          <Button
            variant="outline"
            size="lg"
            className="mt-6"
            onClick={() => window.location.reload()}
          >
            <RefreshCw />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}
