import { cn } from "@/lib/utils";

interface FileTypeIconProps {
  mimeType: string;
  filename: string;
  className?: string;
}

type FileTypeInfo = {
  label: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
};

function getFileTypeInfo(mimeType: string, filename: string): FileTypeInfo {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  // PDF
  if (mimeType === "application/pdf" || ext === "pdf") {
    return {
      label: "PDF",
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950/30",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <path
            d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"
            fill="currentColor"
            opacity="0.15"
          />
          <path
            d="M14 2l6 6h-4a2 2 0 01-2-2V2z"
            fill="currentColor"
            opacity="0.25"
          />
          <text
            x="12"
            y="17"
            textAnchor="middle"
            fontSize="6"
            fontWeight="700"
            fill="currentColor"
            fontFamily="system-ui"
          >
            PDF
          </text>
        </svg>
      ),
    };
  }

  // Excel / Spreadsheet
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    ["xlsx", "xls", "csv", "tsv"].includes(ext)
  ) {
    return {
      label: "XLS",
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/30",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <path
            d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"
            fill="currentColor"
            opacity="0.15"
          />
          <path
            d="M14 2l6 6h-4a2 2 0 01-2-2V2z"
            fill="currentColor"
            opacity="0.25"
          />
          <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="16" x2="16" y2="16" />
            <line x1="11" y1="11" x2="11" y2="18" />
          </g>
        </svg>
      ),
    };
  }

  // Word / Document
  if (
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    ["doc", "docx", "rtf"].includes(ext)
  ) {
    return {
      label: "DOC",
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <path
            d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"
            fill="currentColor"
            opacity="0.15"
          />
          <path
            d="M14 2l6 6h-4a2 2 0 01-2-2V2z"
            fill="currentColor"
            opacity="0.25"
          />
          <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="16" x2="14" y2="16" />
            <line x1="8" y1="19" x2="12" y2="19" />
          </g>
        </svg>
      ),
    };
  }

  // PowerPoint / Presentation
  if (
    mimeType.includes("presentation") ||
    mimeType.includes("powerpoint") ||
    ["pptx", "ppt", "key"].includes(ext)
  ) {
    return {
      label: "PPT",
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-950/30",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <path
            d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"
            fill="currentColor"
            opacity="0.15"
          />
          <path
            d="M14 2l6 6h-4a2 2 0 01-2-2V2z"
            fill="currentColor"
            opacity="0.25"
          />
          <rect
            x="8"
            y="12"
            width="8"
            height="6"
            rx="1"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
      ),
    };
  }

  // Image
  if (
    mimeType.startsWith("image/") ||
    ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico"].includes(ext)
  ) {
    return {
      label: "IMG",
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/30",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <path
            d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"
            fill="currentColor"
            opacity="0.15"
          />
          <path
            d="M14 2l6 6h-4a2 2 0 01-2-2V2z"
            fill="currentColor"
            opacity="0.25"
          />
          <circle cx="10" cy="13" r="1.5" fill="currentColor" opacity="0.5" />
          <path
            d="M8 18l3-3 2 2 3-4 2 3"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    };
  }

  // Archive
  if (
    mimeType.includes("zip") ||
    mimeType.includes("compressed") ||
    mimeType.includes("archive") ||
    ["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext)
  ) {
    return {
      label: "ZIP",
      color: "text-amber-700",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <path
            d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"
            fill="currentColor"
            opacity="0.15"
          />
          <path
            d="M14 2l6 6h-4a2 2 0 01-2-2V2z"
            fill="currentColor"
            opacity="0.25"
          />
          <g fill="currentColor" opacity="0.4">
            <rect x="11" y="10" width="2" height="2" />
            <rect x="11" y="14" width="2" height="2" />
            <rect x="11" y="18" width="2" height="2" />
          </g>
        </svg>
      ),
    };
  }

  // Code
  if (
    mimeType.includes("javascript") ||
    mimeType.includes("json") ||
    mimeType.includes("xml") ||
    mimeType.includes("html") ||
    mimeType.includes("text/plain") ||
    [
      "js",
      "ts",
      "jsx",
      "tsx",
      "py",
      "java",
      "c",
      "cpp",
      "go",
      "rs",
      "rb",
      "php",
      "html",
      "css",
      "json",
      "xml",
      "yaml",
      "yml",
      "sh",
      "swift",
      "kt",
      "scala",
      "sql",
      "md",
      "txt",
    ].includes(ext)
  ) {
    return {
      label: "CODE",
      color: "text-cyan-600",
      bg: "bg-cyan-50 dark:bg-cyan-950/30",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <path
            d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"
            fill="currentColor"
            opacity="0.15"
          />
          <path
            d="M14 2l6 6h-4a2 2 0 01-2-2V2z"
            fill="currentColor"
            opacity="0.25"
          />
          <path
            d="M10 13l-2 2 2 2M14 13l2 2-2 2"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    };
  }

  // Audio
  if (
    mimeType.startsWith("audio/") ||
    ["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext)
  ) {
    return {
      label: "AUDIO",
      color: "text-pink-600",
      bg: "bg-pink-50 dark:bg-pink-950/30",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <path
            d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"
            fill="currentColor"
            opacity="0.15"
          />
          <path
            d="M14 2l6 6h-4a2 2 0 01-2-2V2z"
            fill="currentColor"
            opacity="0.25"
          />
          <path
            d="M12 12v6M9 15v3M15 14v4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    };
  }

  // Video
  if (
    mimeType.startsWith("video/") ||
    ["mp4", "avi", "mov", "mkv", "webm"].includes(ext)
  ) {
    return {
      label: "VIDEO",
      color: "text-rose-600",
      bg: "bg-rose-50 dark:bg-rose-950/30",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <path
            d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"
            fill="currentColor"
            opacity="0.15"
          />
          <path
            d="M14 2l6 6h-4a2 2 0 01-2-2V2z"
            fill="currentColor"
            opacity="0.25"
          />
          <path d="M10 13v5l4.5-2.5L10 13z" fill="currentColor" opacity="0.5" />
        </svg>
      ),
    };
  }

  // Default
  return {
    label: "FILE",
    color: "text-gray-500",
    bg: "bg-gray-50 dark:bg-gray-900/30",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        <path
          d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"
          fill="currentColor"
          opacity="0.15"
        />
        <path
          d="M14 2l6 6h-4a2 2 0 01-2-2V2z"
          fill="currentColor"
          opacity="0.25"
        />
        <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="16" x2="13" y2="16" />
        </g>
      </svg>
    ),
  };
}

export function FileTypeIcon({
  mimeType,
  filename,
  className,
}: FileTypeIconProps) {
  const info = getFileTypeInfo(mimeType, filename);
  return (
    <div
      className={cn(
        "rounded-lg flex items-center justify-center shrink-0",
        info.bg,
        info.color,
        className,
      )}
    >
      {info.icon}
    </div>
  );
}

export { getFileTypeInfo };
