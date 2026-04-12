import { SidebarProvider } from "ui/sidebar";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { AppHeader } from "@/components/layouts/app-header";
import { cookies } from "next/headers";

import { getSession } from "lib/auth/server";
import { COOKIE_KEY_SIDEBAR_STATE } from "lib/const";
import { AppPopupProvider } from "@/components/layouts/app-popup-provider";
import { SWRConfigProvider } from "./swr-config";

import { redirect } from "next/navigation";
export const experimental_ppr = true;

export default async function ChatLayout({
  children,
}: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  const isCollapsed =
    cookieStore.get(COOKIE_KEY_SIDEBAR_STATE)?.value !== "true";
  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <SWRConfigProvider user={session.user}>
        <AppPopupProvider />
        <AppSidebar user={session.user} />
        <main className="relative bg-background flex-1 min-w-0 flex flex-col h-screen">
          <AppHeader />
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            {children}
          </div>
        </main>
      </SWRConfigProvider>
    </SidebarProvider>
  );
}
