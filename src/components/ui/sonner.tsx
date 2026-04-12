"use client";

import { useTheme } from "next-themes";
import { useMemo } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();
  const themeBase = useMemo(() => {
    return theme === "dark" ? "dark" : "light";
  }, [theme]);
  return (
    <Sonner
      theme={themeBase as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      toastOptions={{
        className: "bg-background! text-foreground! border-border! shadow-lg!",
      }}
      {...props}
    />
  );
};

export { Toaster };
