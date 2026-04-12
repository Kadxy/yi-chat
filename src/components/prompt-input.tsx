"use client";

import {
  ChevronDown,
  MonitorIcon,
  SendIcon,
  FileTextIcon,
  Loader2,
  PaperclipIcon,
  PlusIcon,
  Square,
  XIcon,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "ui/button";
import { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { SelectModel } from "./select-model";
import { appStore, UploadedFile } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { ChatModel } from "app-types/chat";

import { ToolSelectDropdown } from "./tool-select-dropdown";
import { ThinkingToggle } from "./thinking-mode-dropdown";

import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { useTranslations } from "next-intl";
import { ClaudeIcon } from "ui/claude-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useThreadFileUploader } from "@/hooks/use-thread-file-uploader";

import { FileUIPart, TextUIPart } from "ai";
import { toast } from "sonner";
import {
  isFilePartSupported,
  isIngestSupported,
  isUploadBlocked,
} from "@/lib/ai/file-support";
import { useChatModels } from "@/hooks/queries/use-chat-models";
import { FileTypeIcon } from "./file-type-icon";

interface PromptInputProps {
  placeholder?: string;
  setInput: (value: string) => void;
  input: string;
  onStop: () => void;
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
  toolDisabled?: boolean;
  isLoading?: boolean;
  model?: ChatModel;
  setModel?: (model: ChatModel) => void;
  threadId?: string;
  onFocus?: () => void;
}

export default function PromptInput({
  placeholder,
  sendMessage,
  model,
  setModel,
  input,
  onFocus,
  setInput,
  onStop,
  isLoading,
  toolDisabled,
  threadId,
}: PromptInputProps) {
  const t = useTranslations("Chat");
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { uploadFiles } = useThreadFileUploader(threadId);
  const { data: providers } = useChatModels();

  const [globalModel, threadFiles, appStoreMutate] = appStore(
    useShallow((state) => [state.chatModel, state.threadFiles, state.mutate]),
  );

  const modelInfo = useMemo(() => {
    const provider = providers?.find(
      (provider) => provider.provider === globalModel?.provider,
    );
    const model = provider?.models.find(
      (model) => model.name === globalModel?.model,
    );
    return model;
  }, [providers, globalModel]);

  const supportedFileMimeTypes = modelInfo?.supportedFileMimeTypes;

  const uploadedFiles = useMemo<UploadedFile[]>(() => {
    if (!threadId) return [];
    return threadFiles[threadId] ?? [];
  }, [threadFiles, threadId]);

  const chatModel = useMemo(() => {
    return model ?? globalModel;
  }, [model, globalModel]);

  const setChatModel = useCallback(
    (model: ChatModel) => {
      if (setModel) {
        setModel(model);
      } else {
        appStoreMutate({ chatModel: model });
      }
    },
    [setModel, appStoreMutate],
  );

  const deleteFile = useCallback(
    (fileId: string) => {
      if (!threadId) return;

      // Find file and abort if uploading
      const file = uploadedFiles.find((f) => f.id === fileId);
      if (file?.isUploading && file.abortController) {
        file.abortController.abort();
      }

      // Cleanup preview URL if exists
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }

      appStoreMutate((prev) => {
        const newFiles = uploadedFiles.filter((f) => f.id !== fileId);
        return {
          threadFiles: {
            ...prev.threadFiles,
            [threadId]: newFiles,
          },
        };
      });
    },
    [uploadedFiles, threadId, appStoreMutate],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (!list) return;
      const files = Array.from(list).filter((file) => {
        if (isUploadBlocked(file.name)) {
          toast.error(`${file.name}: file type not allowed`);
          return false;
        }
        return true;
      });
      const MAX_FILES = 10;
      if (uploadedFiles.length + files.length > MAX_FILES) {
        toast.error(t("maxFilesPerMessage", { count: MAX_FILES }));
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (files.length > 0) await uploadFiles(files);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsUploadDropdownOpen(false);
    },
    [uploadFiles, uploadedFiles],
  );

  const handleCaptureScreen = useCallback(async () => {
    setIsUploadDropdownOpen(false);
    let stream: MediaStream | null = null;
    try {
      const captureController =
        "CaptureController" in window
          ? new (window as any).CaptureController()
          : null;
      if (captureController) {
        captureController.setFocusBehavior("no-focus-change");
      }
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: false,
        controller: captureController,
      } as any);
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `screenshot-${Date.now()}.png`, {
        type: "image/png",
      });
      await uploadFiles([file]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") return;
      console.error("Screenshot failed:", err);
    } finally {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      window.focus();
    }
  }, [uploadFiles]);

  const submit = () => {
    if (isLoading) return;
    if (uploadedFiles.some((file) => file.isUploading)) {
      toast.error("Please wait for files to finish uploading before sending.");
      return;
    }
    const userMessage = input?.trim() || "";
    if (userMessage.length === 0) return;

    setInput("");
    const attachmentParts = uploadedFiles.reduce<
      Array<FileUIPart | TextUIPart | any>
    >((acc, file) => {
      const isFileSupported = isFilePartSupported(
        file.mimeType,
        supportedFileMimeTypes,
      );
      const link = file.url || file.dataUrl || "";
      if (!link) return acc;
      if (isFileSupported) {
        acc.push({
          type: "file",
          url: link,
          mediaType: file.mimeType,
          filename: file.name,
        } as FileUIPart);
      } else {
        acc.push({
          type: "source-url",
          url: link,
          title: file.name,
          mediaType: file.mimeType,
        } as any);
      }
      return acc;
    }, []);

    if (attachmentParts.length) {
      const summary = uploadedFiles
        .map((file, index) => {
          const type = file.mimeType || "unknown";
          const link = file.url || file.dataUrl || "";
          const isNative = isFilePartSupported(type, supportedFileMimeTypes);
          if (isNative) {
            return `${index + 1}. ${file.name} (${type})`;
          }
          return `${index + 1}. ${file.name} (${type}) - URL: ${link} (use read-user-file tool to read content)`;
        })
        .join("\n");

      attachmentParts.unshift({
        type: "text",
        text: `Attached files:\n${summary}`,
        ingestionPreview: true,
      });
    }

    sendMessage({
      role: "user",
      parts: [...attachmentParts, { type: "text", text: userMessage }],
    });
    appStoreMutate((prev) => ({
      threadFiles: {
        ...prev.threadFiles,
        [threadId!]: [],
      },
    }));
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        !e.metaKey &&
        !e.nativeEvent.isComposing
      ) {
        e.preventDefault();
        submit();
      }
    },
    [submit],
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="z-10 mx-auto w-full max-w-3xl relative">
        <fieldset className="flex w-full min-w-0 max-w-full flex-col px-4">
          <div className="shadow-lg rounded-4xl backdrop-blur-sm bg-muted/60 relative flex w-full flex-col cursor-text z-10 items-stretch focus-within:bg-muted hover:bg-muted">
            <div className="p-3">
              {/* Uploaded Files Preview - Above Input (Gemini style) */}
              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {uploadedFiles.map((file) => {
                    const isImage = file.mimeType.startsWith("image/");
                    const imageSrc =
                      file.previewUrl || file.url || file.dataUrl || "";
                    const displayName = file.name;
                    const displayExt =
                      file.name.split(".").pop()?.toUpperCase() || "FILE";
                    const isSummarizable = isIngestSupported(file.mimeType);
                    return (
                      <div key={file.id} className="relative group">
                        {isImage ? (
                          <div
                            className={cn(
                              "w-16 h-16 rounded-xl overflow-hidden border border-border",
                              file.isUploading && "opacity-50",
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imageSrc}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "w-40 h-14 flex items-center gap-2 px-2.5 rounded-xl border border-border bg-background/80 transition-colors hover:bg-accent/60",
                                  file.isUploading && "opacity-50",
                                )}
                              >
                                {file.isUploading ? (
                                  <Loader2 className="size-8 p-1 animate-spin text-muted-foreground shrink-0" />
                                ) : (
                                  <FileTypeIcon
                                    mimeType={file.mimeType}
                                    filename={file.name}
                                    className="size-8 p-1"
                                  />
                                )}
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-xs font-medium text-foreground truncate">
                                    {displayName}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {displayExt}
                                  </span>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              {displayName}
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Delete Button */}
                        <button
                          className={cn(
                            "absolute top-2 right-2 size-6 p-1.5 rounded-full bg-foreground/70 text-background flex items-center justify-center transition-opacity",
                            file.isUploading
                              ? "hidden"
                              : "opacity-0 group-hover:opacity-100",
                          )}
                          onClick={() => deleteFile(file.id)}
                        >
                          <XIcon className="size-3" />
                        </button>

                        {/* Summarize overlay for non-uploading files */}
                        {!file.isUploading && isSummarizable && !isImage && (
                          <div className="absolute inset-0 bg-background/70 rounded-xl backdrop-blur-sm transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Button
                              variant="secondary"
                              size="icon"
                              className="rounded-full size-7"
                              onClick={async () => {
                                try {
                                  const url = file.url || file.dataUrl;
                                  if (!url) {
                                    toast.error("No file URL available");
                                    return;
                                  }
                                  const res = await fetch(
                                    "/api/storage/ingest",
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({ url }),
                                    },
                                  );
                                  if (!res.ok) {
                                    const e = await res
                                      .json()
                                      .catch(() => ({}));
                                    toast.error(
                                      e.error || "Failed to ingest file",
                                    );
                                    return;
                                  }
                                  const data = await res.json();
                                  setInput(
                                    `${input ? input + "\n\n" : ""}${data.text}`,
                                  );
                                } catch (_err) {
                                  toast.error("Failed to ingest file");
                                }
                              }}
                            >
                              <FileTextIcon className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <textarea
                ref={textareaRef}
                className="w-full max-h-80 min-h-[24px] [field-sizing:content] break-words overflow-y-auto no-scrollbar resize-none focus:outline-none px-3 py-2 text-sm bg-transparent mb-2"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={onFocus}
                placeholder={
                  placeholder ??
                  t("placeholder", {
                    appName: process.env.NEXT_PUBLIC_APP_NAME || "Yi Chat",
                  })
                }
                rows={1}
                autoFocus
              />

              <div className="flex w-full items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={!threadId}
                />

                <DropdownMenu
                  open={isUploadDropdownOpen}
                  onOpenChange={setIsUploadDropdownOpen}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={"ghost"}
                      size={"sm"}
                      className="rounded-full hover:bg-input! p-2! data-[state=open]:bg-input!"
                      disabled={!threadId}
                    >
                      <PlusIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="top">
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <PaperclipIcon className="mr-2 size-4" />
                      {t("uploadFile")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={handleCaptureScreen}
                    >
                      <MonitorIcon className="mr-2 size-4" />
                      {t("captureScreen")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {!toolDisabled && (
                  <>
                    <ToolSelectDropdown
                      className="mx-1"
                      align="start"
                      side="top"
                    />
                    <ThinkingToggle />
                  </>
                )}

                <div className="flex-1" />

                <SelectModel onSelect={setChatModel} currentModel={chatModel}>
                  <Button
                    variant={"ghost"}
                    size={"sm"}
                    className="rounded-full group data-[state=open]:bg-input! hover:bg-input! mr-1"
                    data-testid="model-selector-button"
                  >
                    {chatModel?.model ? (
                      <>
                        <ClaudeIcon className="size-4" />
                        <span
                          className="text-foreground group-data-[state=open]:text-foreground  "
                          data-testid="selected-model-name"
                        >
                          {providers
                            ?.find((p) => p.provider === chatModel.provider)
                            ?.models.find((m) => m.name === chatModel.model)
                            ?.displayName || chatModel.model}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">model</span>
                    )}

                    <ChevronDown className="size-3" />
                  </Button>
                </SelectModel>
                <div
                  onClick={() => {
                    if (isLoading) {
                      onStop();
                    } else {
                      submit();
                    }
                  }}
                  className={cn(
                    "cursor-pointer rounded-full p-2 transition-colors duration-150",
                    input.trim().length > 0 || isLoading
                      ? "bg-foreground text-background hover:bg-foreground/80"
                      : "text-muted-foreground bg-secondary hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {isLoading ? (
                    <Square size={16} className="fill-current" />
                  ) : (
                    <SendIcon size={16} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
