import { z } from "zod";
import { UIMessage } from "ai";
import { ChatMetadata } from "./chat";

export type ChatExport = {
  id: string;
  title: string;
  exporterId: string;
  originalThreadId?: string;
  messages: Array<{
    id: string;
    role: UIMessage["role"];
    parts: UIMessage["parts"];
    metadata?: ChatMetadata;
  }>;
  exportedAt: Date;
  expiresAt?: Date;
};

export const ChatExportByThreadIdSchema = z.object({
  threadId: z.string(),
  expiresAt: z.date().nullish(),
});

export const ChatExportCreateSchema = z.object({
  title: z.string().min(1).max(200),
  exporterId: z.string(),
  originalThreadId: z.string().nullish(),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.string(),
      parts: z.any(),
      metadata: z.any().optional(),
    }),
  ),
  expiresAt: z.date().nullish(),
});

export type ChatExportWithUser = ChatExport & {
  exporterName: string | null;
  exporterImage?: string;
};

export type ChatExportSummary = {
  id: string;
  title: string;
  exporterId: string;
  originalThreadId?: string;
  exportedAt: Date;
  expiresAt?: Date;
};

export type ChatExportRepository = {
  exportChat(data: {
    threadId: string;
    exporterId?: string;
    expiresAt?: Date;
  }): Promise<string>;
  insert(data: z.infer<typeof ChatExportCreateSchema>): Promise<string>;
  selectById(id: string): Promise<ChatExport | null>;
  selectByIdWithUser(id: string): Promise<ChatExportWithUser | null>;
  selectByExporterId(exporterId: string): Promise<ChatExport[]>;
  selectSummaryByExporterId(exporterId: string): Promise<ChatExportSummary[]>;
  checkAccess(id: string, userId: string): Promise<boolean>;
  deleteById(id: string): Promise<void>;
  isExpired(id: string): Promise<boolean>;
};
