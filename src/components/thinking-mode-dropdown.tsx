"use client";

import { appStore } from "@/app/store";
import { Lightbulb, LightbulbOff } from "lucide-react";
import { Button } from "ui/button";
import { useTranslations } from "next-intl";

import { useShallow } from "zustand/shallow";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { cn } from "lib/utils";
import { getShortcutKeyList, Shortcuts } from "lib/keyboard-shortcuts";

export const ThinkingToggle = ({ disabled }: { disabled?: boolean }) => {
  const t = useTranslations("Chat.Thinking");
  const [thinkingEnabled, appStoreMutate] = appStore(
    useShallow((state) => [state.thinkingEnabled, state.mutate]),
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={"ghost"}
          size={"sm"}
          disabled={disabled}
          className={cn(
            "rounded-full p-2! hover:bg-input!",
            !thinkingEnabled && "text-muted-foreground",
            thinkingEnabled && "text-primary",
          )}
          onClick={() => appStoreMutate({ thinkingEnabled: !thinkingEnabled })}
        >
          {thinkingEnabled ? <Lightbulb /> : <LightbulbOff />}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2" side="top">
        {thinkingEnabled ? t("on") : t("off")}
        <span className="text-muted-foreground ml-2">
          {getShortcutKeyList(Shortcuts.thinkingMode).join("")}
        </span>
      </TooltipContent>
    </Tooltip>
  );
};
