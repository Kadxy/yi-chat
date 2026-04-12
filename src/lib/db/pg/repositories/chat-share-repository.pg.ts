import {
  ChatShare,
  ChatShareCreateSchema,
  ChatShareRepository,
  ChatShareSummary,
  ChatShareWithUser,
} from "app-types/chat-share";
import { pgDb } from "../db.pg";
import { ChatShareTable, UserTable } from "../schema.pg";
import { and, eq, sql } from "drizzle-orm";
import z from "zod";
import { pgChatRepository } from "./chat-repository.pg";

function toChatShare(data: typeof ChatShareTable.$inferSelect): ChatShare {
  return {
    id: data.id,
    sharerId: data.sharerId,
    title: data.title,
    messages: data.messages,
    originalThreadId: data.originalThreadId ?? undefined,
    sharedAt: data.sharedAt,
    expiresAt: data.expiresAt ?? undefined,
  };
}

function toChatShareInsert(
  data: z.infer<typeof ChatShareCreateSchema>,
): typeof ChatShareTable.$inferInsert {
  return ChatShareCreateSchema.parse(data) as ChatShare;
}

export const pgChatShareRepository: ChatShareRepository = {
  shareChat: async ({ threadId, sharerId, expiresAt }) => {
    const [thread, messages] = await Promise.all([
      pgChatRepository.selectThread(threadId),
      pgChatRepository.selectMessagesByThreadId(threadId),
    ]);

    if (!thread) {
      throw new Error("Thread not found");
    }

    return await pgChatShareRepository.insert({
      sharerId: sharerId ?? thread.userId,
      title: thread.title,
      messages: messages.map((m) => {
        // Strip sensitive fields from metadata before sharing
        const { creditCost, usage, ...safeMetadata } = m.metadata ?? {};
        return {
          id: m.id,
          role: m.role,
          parts: m.parts,
          metadata:
            Object.keys(safeMetadata).length > 0 ? safeMetadata : undefined,
        };
      }),
      originalThreadId: threadId,
      expiresAt,
    });
  },

  insert: async (data) => {
    const result = await pgDb
      .insert(ChatShareTable)
      .values(toChatShareInsert(data))
      .returning();
    return result[0].id;
  },
  selectById: async (id) => {
    const [result] = await pgDb
      .select()
      .from(ChatShareTable)
      .where(eq(ChatShareTable.id, id));
    return toChatShare(result);
  },
  selectByIdWithUser: async (id) => {
    const [result] = await pgDb
      .select({
        id: ChatShareTable.id,
        title: ChatShareTable.title,
        sharerId: ChatShareTable.sharerId,
        messages: ChatShareTable.messages,
        sharedAt: ChatShareTable.sharedAt,
        expiresAt: ChatShareTable.expiresAt,
        originalThreadId: ChatShareTable.originalThreadId,
        sharerName: UserTable.name,
        sharerImage: UserTable.image,
      })
      .from(ChatShareTable)
      .leftJoin(UserTable, eq(ChatShareTable.sharerId, UserTable.id))
      .where(eq(ChatShareTable.id, id));
    return result as ChatShareWithUser;
  },
  selectBySharerId: async (sharerId) => {
    const result = await pgDb
      .select()
      .from(ChatShareTable)
      .where(eq(ChatShareTable.sharerId, sharerId));
    return result.map(toChatShare);
  },
  selectSummaryBySharerId: async (sharerId) => {
    const result = await pgDb
      .select({
        id: ChatShareTable.id,
        title: ChatShareTable.title,
        sharerId: ChatShareTable.sharerId,
        originalThreadId: ChatShareTable.originalThreadId,
        sharedAt: ChatShareTable.sharedAt,
        expiresAt: ChatShareTable.expiresAt,
      })
      .from(ChatShareTable)
      .where(eq(ChatShareTable.sharerId, sharerId))
      .orderBy(sql`${ChatShareTable.sharedAt} DESC`);

    return result.map((row) => ({
      ...row,
      originalThreadId: row.originalThreadId ?? undefined,
      expiresAt: row.expiresAt ?? undefined,
    })) as ChatShareSummary[];
  },
  checkAccess: async (id, userId) => {
    const result = await pgDb
      .select({
        sharerId: ChatShareTable.sharerId,
      })
      .from(ChatShareTable)
      .where(
        and(eq(ChatShareTable.id, id), eq(ChatShareTable.sharerId, userId)),
      );
    return result.length > 0;
  },
  deleteById: async (id) => {
    await pgDb.delete(ChatShareTable).where(eq(ChatShareTable.id, id));
  },
  deleteAllBySharerId: async (sharerId) => {
    await pgDb
      .delete(ChatShareTable)
      .where(eq(ChatShareTable.sharerId, sharerId));
  },
  isExpired: async (id) => {
    const [result] = await pgDb
      .select({
        expiresAt: ChatShareTable.expiresAt,
      })
      .from(ChatShareTable)
      .where(eq(ChatShareTable.id, id));
    return !!result?.expiresAt && result.expiresAt < new Date();
  },
};
