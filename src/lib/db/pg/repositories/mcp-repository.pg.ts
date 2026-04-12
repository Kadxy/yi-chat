import { pgDb as db } from "../db.pg";
import { McpServerTable } from "../schema.pg";
import { eq, desc } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import type { MCPRepository } from "app-types/mcp";

export const pgMcpRepository: MCPRepository = {
  async save(server) {
    const [result] = await db
      .insert(McpServerTable)
      .values({
        id: server.id ?? generateUUID(),
        name: server.name,
        config: server.config,
        userId: server.userId,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [McpServerTable.id],
        set: {
          config: server.config,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  },

  async selectById(id) {
    const [result] = await db
      .select()
      .from(McpServerTable)
      .where(eq(McpServerTable.id, id));
    return result;
  },

  async selectAll() {
    const results = await db.select().from(McpServerTable);
    return results;
  },

  async selectAllForUser(userId) {
    const results = await db
      .select()
      .from(McpServerTable)
      .where(eq(McpServerTable.userId, userId))
      .orderBy(desc(McpServerTable.createdAt));
    return results;
  },

  async deleteById(id) {
    await db.delete(McpServerTable).where(eq(McpServerTable.id, id));
  },

  async selectByServerName(name) {
    const [result] = await db
      .select()
      .from(McpServerTable)
      .where(eq(McpServerTable.name, name));
    return result;
  },

  async updateToolInfo(id, toolInfo) {
    await db
      .update(McpServerTable)
      .set({
        toolInfo,
        toolInfoUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(McpServerTable.id, id));
  },

  async updateConnectionStatus(id, status) {
    await db
      .update(McpServerTable)
      .set({
        lastConnectionStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(McpServerTable.id, id));
  },

  async existsByServerName(name) {
    const [result] = await db
      .select({ id: McpServerTable.id })
      .from(McpServerTable)
      .where(eq(McpServerTable.name, name));

    return !!result;
  },
};
