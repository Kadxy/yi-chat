"use client";

import { useCallback } from "react";
import { appStore, UploadedFile } from "@/app/store";
import { useFileUpload } from "@/hooks/use-presigned-upload";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { generateUUID } from "@/lib/utils";
import { toast } from "sonner";

export function useThreadFileUploader(threadId?: string) {
  const appStoreMutate = appStore((s) => s.mutate);
  const { upload } = useFileUpload();
  const planLimits = usePlanLimits();

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!threadId || files.length === 0) return;
      const maxSizeBytes = planLimits.maxFileSizeMB * 1024 * 1024;

      // Filter valid files and prepare all at once
      const validFiles: { file: File; entry: UploadedFile }[] = [];
      for (const file of files) {
        if (file.size > maxSizeBytes) {
          toast.error(
            `${file.name}: file too large (>${planLimits.maxFileSizeMB}MB)`,
          );
          continue;
        }

        const previewUrl = file.type?.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined;

        validFiles.push({
          file,
          entry: {
            id: generateUUID(),
            url: "",
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            isUploading: true,
            progress: 0,
            previewUrl,
            abortController: new AbortController(),
          },
        });
      }

      if (validFiles.length === 0) return;

      // Add ALL files to store at once — they all appear in UI immediately
      appStoreMutate((prev) => ({
        threadFiles: {
          ...prev.threadFiles,
          [threadId]: [
            ...(prev.threadFiles[threadId] ?? []),
            ...validFiles.map((v) => v.entry),
          ],
        },
      }));

      // Upload all files concurrently
      await Promise.allSettled(
        validFiles.map(async ({ file, entry }) => {
          try {
            const uploaded = await upload(file);
            if (uploaded) {
              appStoreMutate((prev) => ({
                threadFiles: {
                  ...prev.threadFiles,
                  [threadId]: (prev.threadFiles[threadId] ?? []).map((f) =>
                    f.id === entry.id
                      ? {
                          ...f,
                          url: uploaded.url,
                          isUploading: false,
                          progress: 100,
                        }
                      : f,
                  ),
                },
              }));
            } else {
              appStoreMutate((prev) => ({
                threadFiles: {
                  ...prev.threadFiles,
                  [threadId]: (prev.threadFiles[threadId] ?? []).filter(
                    (f) => f.id !== entry.id,
                  ),
                },
              }));
            }
          } catch {
            appStoreMutate((prev) => ({
              threadFiles: {
                ...prev.threadFiles,
                [threadId]: (prev.threadFiles[threadId] ?? []).filter(
                  (f) => f.id !== entry.id,
                ),
              },
            }));
          } finally {
            if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
          }
        }),
      );
    },
    [threadId, appStoreMutate, upload, planLimits],
  );

  return { uploadFiles };
}
