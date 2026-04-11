"use client";

import { appStore } from "@/app/store";
import { useChatModels } from "@/hooks/queries/use-chat-models";
import { ChatModel } from "app-types/chat";
import { cn } from "lib/utils";
import { CheckIcon, ChevronDown } from "lucide-react";
import { PropsWithChildren, useEffect, useState } from "react";
import { Button } from "ui/button";
import { ModelProviderIcon } from "ui/model-provider-icon";
import { Popover, PopoverContent, PopoverTrigger } from "ui/popover";

interface SelectModelProps {
  onSelect: (model: ChatModel) => void;
  align?: "start" | "end";
  currentModel?: ChatModel;
  showProvider?: boolean;
}

export const SelectModel = (props: PropsWithChildren<SelectModelProps>) => {
  const [open, setOpen] = useState(false);
  const { data: providers } = useChatModels();
  const [model, setModel] = useState(props.currentModel);

  const modelDisplayName = providers
    ?.find((p) => p.provider === model?.provider)
    ?.models.find((m) => m.name === model?.model)?.displayName;

  useEffect(() => {
    const modelToUse = props.currentModel ?? appStore.getState().chatModel;
    if (modelToUse) {
      setModel(modelToUse);
    }
  }, [props.currentModel]);

  const flatModels = providers?.flatMap((provider) =>
    provider.models.map((m) => ({
      ...m,
      provider: provider.provider,
      providerDisplayName: provider.displayName,
      hasAPIKey: provider.hasAPIKey,
    })),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {props.children || (
          <Button
            variant={"secondary"}
            size={"sm"}
            className="data-[state=open]:bg-input! hover:bg-input!"
            data-testid="model-selector-button"
          >
            <div className="mr-auto flex items-center gap-1">
              {(props.showProvider ?? true) && (
                <ModelProviderIcon
                  provider={model?.provider || ""}
                  className="size-2.5 mr-1"
                />
              )}
              <p data-testid="selected-model-name">
                {modelDisplayName || model?.model || "model"}
              </p>
            </div>
            <ChevronDown className="size-3" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="p-1 w-[220px]"
        align={props.align || "end"}
        data-testid="model-selector-popover"
      >
        <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
          {flatModels?.map((item) => {
            const isSelected =
              model?.provider === item.provider && model?.model === item.name;
            return (
              <button
                key={`${item.provider}-${item.name}`}
                disabled={!item.hasAPIKey}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm cursor-pointer transition-colors",
                  "hover:bg-accent",
                  !item.hasAPIKey && "opacity-40 cursor-not-allowed",
                )}
                onClick={() => {
                  setModel({ provider: item.provider, model: item.name });
                  props.onSelect({ provider: item.provider, model: item.name });
                  setOpen(false);
                }}
                data-testid={`model-option-${item.provider}-${item.name}`}
              >
                <ModelProviderIcon
                  provider={item.provider}
                  className="size-4 shrink-0"
                />
                <span className="flex-1 text-left">{item.displayName}</span>
                {isSelected && (
                  <CheckIcon
                    className="size-4 text-muted-foreground shrink-0"
                    data-testid="selected-model-check"
                  />
                )}
                {item.isToolCallUnsupported && (
                  <span className="text-xs text-muted-foreground">
                    No tools
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
