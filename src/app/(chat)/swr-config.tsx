"use client";

import { BasicUser } from "app-types/user";
import { useEffect, useMemo } from "react";
import { SWRConfig, SWRConfiguration } from "swr";

export function SWRConfigProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: BasicUser;
}) {
  const config = useMemo<SWRConfiguration>(() => {
    return {
      focusThrottleInterval: 30000,
      dedupingInterval: 2000,
      errorRetryCount: 1,
      fallback: {
        "/api/user/details": user,
      },
    };
  }, [user]);

  useEffect(() => {
    console.log(
      "%c⚡ Yi Chat",
      "color: #00d4ff; font-size: 20px; font-weight: bold;",
    );
  }, []);
  return <SWRConfig value={config}>{children}</SWRConfig>;
}
