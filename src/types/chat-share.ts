import { z } from "zod";
import { UIMessage } from "ai";
import { ChatMetadata } from "./chat";

export type ChatShare = {
  id: string;
  title: string;
  sharerId: string;
  originalThreadId?: string;
  messages: Array<{
    id: string;
    role: UIMessage["role"];
    parts: UIMessage["parts"];
    metadata?: ChatMetadata;
  }>;
  sharedAt: Date;
  expiresAt?: Date;
};

export const ChatShareByThreadIdSchema = z.object({
  threadId: z.string(),
  expiresAt: z.date().nullish(),
});

export const ChatShareCreateSchema = z.object({
  title: z.string().min(1).max(200),
  sharerId: z.string(),
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

export type ChatShareWithUser = ChatShare & {
  sharerName: string | null;
  sharerImage?: string;
};

export type ChatShareSummary = {
  id: string;
  title: string;
  sharerId: string;
  originalThreadId?: string;
  sharedAt: Date;
  expiresAt?: Date;
};

export type ChatShareRepository = {
  shareChat(data: {
    threadId: string;
    sharerId?: string;
    expiresAt?: Date;
  }): Promise<string>;
  insert(data: z.infer<typeof ChatShareCreateSchema>): Promise<string>;
  selectById(id: string): Promise<ChatShare | null>;
  selectByIdWithUser(id: string): Promise<ChatShareWithUser | null>;
  selectBySharerId(sharerId: string): Promise<ChatShare[]>;
  selectSummaryBySharerId(sharerId: string): Promise<ChatShareSummary[]>;
  checkAccess(id: string, userId: string): Promise<boolean>;
  deleteById(id: string): Promise<void>;
  deleteAllBySharerId(sharerId: string): Promise<void>;
  isExpired(id: string): Promise<boolean>;
};
