"use client";

import Link from "next/link";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { Button } from "ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <BackgroundPaths />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-8xl sm:text-9xl font-bold tracking-tighter text-foreground/10">
            404
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            The page you are looking for does not exist.
          </p>
          <Button variant="outline" size="lg" className="mt-6" asChild>
            <Link href="/">
              <ArrowLeft />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
