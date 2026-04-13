"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { isShortcutEvent, Shortcuts } from "lib/keyboard-shortcuts";

const KeyboardShortcutsPopup = dynamic(
  () =>
    import("@/components/keyboard-shortcuts-popup").then(
      (mod) => mod.KeyboardShortcutsPopup,
    ),
  { ssr: false },
);

const PlanModal = dynamic(
  () => import("@/components/plan-modal").then((mod) => mod.PlanModal),
  { ssr: false },
);

const RedeemCodeDialog = dynamic(
  () =>
    import("@/components/redeem-code-dialog").then(
      (mod) => mod.RedeemCodeDialog,
    ),
  { ssr: false },
);

function GlobalShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isShortcutEvent(e, Shortcuts.openChatPreferences)) {
        e.preventDefault();
        e.stopPropagation();
        router.push("/preferences");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return null;
}

export function AppPopupProvider() {
  return (
    <>
      <KeyboardShortcutsPopup />
      <PlanModal />
      <RedeemCodeDialog />
      <GlobalShortcuts />
    </>
  );
}
