"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "ui/sidebar";
import { PanelLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { isShortcutEvent, Shortcuts } from "lib/keyboard-shortcuts";

interface SidebarHeaderSharedProps {
  title: string | React.ReactNode;
  href: string;
  showMobileToggle?: boolean;
  onLinkClick?: () => void;
  enableShortcuts?: boolean;
}

export function SidebarHeaderShared({
  title,
  href,
  showMobileToggle = true,
  onLinkClick,
  enableShortcuts = false,
}: SidebarHeaderSharedProps) {
  const { toggleSidebar, setOpenMobile, open } = useSidebar();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const currentPath = useRef<string | null>(null);

  // Handle shortcuts (only for main app sidebar)
  useEffect(() => {
    if (!enableShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isShortcutEvent(e, Shortcuts.toggleSidebar)) {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar, enableShortcuts]);

  useEffect(() => {
    if (pathname === currentPath.current) return;
    if (isMobile) {
      setOpenMobile(false);
    }
    currentPath.current = pathname;
  }, [pathname, isMobile]);

  const handleLinkClick = (e: React.MouseEvent) => {
    if (onLinkClick) {
      e.preventDefault();
      onLinkClick();
    }
  };

  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem className="flex items-center gap-0.5 mb-1">
          <Link
            href={href}
            onClick={handleLinkClick}
            className="flex items-center gap-2 px-2 py-1.5"
          >
            <span className="text-lg font-bold">{title}</span>
            {showMobileToggle && (
              <div
                className="ml-auto block sm:hidden"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpenMobile(false);
                }}
                data-state={open ? "open" : "closed"}
                data-testid="sidebar-header-toggle-mobile"
              >
                <PanelLeft className="size-4" />
              </div>
            )}
          </Link>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}
