"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

interface UploadOptions {
  filename?: string;
  contentType?: string;
}

interface UploadResult {
  pathname: string;
  url: string;
  contentType?: string;
  size?: number;
}

/**
 * Hook for uploading files via S3 presigned URLs.
 */
export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(
    async (
      file: File,
      uploadOptions: UploadOptions = {},
    ): Promise<UploadResult | undefined> => {
      if (!(file instanceof File)) {
        toast.error("Upload expects a File instance");
        return;
      }

      const filename = uploadOptions.filename ?? file.name;
      const contentType =
        uploadOptions.contentType || file.type || "application/octet-stream";

      setIsUploading(true);
      try {
        const uploadUrlResponse = await fetch("/api/storage/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename, contentType }),
        });

        if (!uploadUrlResponse.ok) {
          const errorBody = await uploadUrlResponse.json().catch(() => ({}));
          if (errorBody.solution) {
            toast.error(errorBody.error || "Failed to get upload URL", {
              description: errorBody.solution,
              duration: 10000,
            });
          } else {
            toast.error(errorBody.error || "Failed to get upload URL");
          }
          return;
        }

        const uploadUrlData = await uploadUrlResponse.json();

        const uploadResponse = await fetch(uploadUrlData.url, {
          method: uploadUrlData.method || "PUT",
          headers: uploadUrlData.headers || { "Content-Type": contentType },
          body: file,
        });

        if (!uploadResponse.ok) {
          toast.error(`Upload failed: ${uploadResponse.status}`);
          return;
        }

        return {
          pathname: uploadUrlData.key,
          url: uploadUrlData.sourceUrl ?? uploadUrlData.url,
          contentType,
          size: file.size,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        toast.error(message);
        return;
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  return {
    upload,
    isUploading,
  };
}
