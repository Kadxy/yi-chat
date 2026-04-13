import { UserPreferences } from "app-types/user";
import { MCPServerConfig, MCPToolInfo } from "app-types/mcp";
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  json,
  uuid,
  boolean,
  varchar,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { isNotNull } from "drizzle-orm";
import { UIMessage } from "ai";
import { ChatMetadata } from "app-types/chat";

export const ChatThreadTable = pgTable(
  "chat_thread",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    title: text("title").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("chat_thread_user_id_created_at_idx").on(t.userId, t.createdAt),
  ],
);

export const ChatMessageTable = pgTable(
  "chat_message",
  {
    id: text("id").primaryKey().notNull(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => ChatThreadTable.id, { onDelete: "cascade" }),
    role: text("role").notNull().$type<UIMessage["role"]>(),
    parts: json("parts").notNull().array().$type<UIMessage["parts"]>(),
    metadata: json("metadata").$type<ChatMetadata>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("chat_message_thread_id_idx").on(t.threadId)],
);

export const McpServerTable = pgTable("mcp_server", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  config: json("config").notNull().$type<MCPServerConfig>(),
  enabled: boolean("enabled").notNull().default(true),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  toolInfo: json("tool_info").$type<MCPToolInfo[]>(),
  toolInfoUpdatedAt: timestamp("tool_info_updated_at"),
  lastConnectionStatus: varchar("last_connection_status", {
    enum: ["connected", "error"],
  }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const UserTable = pgTable("user", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  password: text("password"),
  image: text("image"),
  preferences: json("preferences").default({}).$type<UserPreferences>(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  banned: boolean("banned"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  role: text("role").notNull().default("user"),
  plan: text("plan").notNull().default("free"),
  planExpiresAt: timestamp("plan_expires_at"),
  creditBalance: integer("credit_balance").notNull().default(0),
});

// Role tables removed - using Better Auth's built-in role system
// Roles are now managed via the 'role' field on UserTable

export const CreditTransactionTable = pgTable(
  "credit_transaction",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    type: varchar("type", {
      enum: [
        "signup",
        "sign_in",
        "subscription",
        "topup",
        "usage",
        "admin_grant",
        "admin_deduct",
        "redemption",
      ],
    }).notNull(),
    description: text("description"),
    // For usage type: which model and how many tokens
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("credit_tx_user_id_idx").on(t.userId),
    index("credit_tx_created_at_idx").on(t.createdAt),
  ],
);

export const SessionTable = pgTable("session", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  // Admin plugin field (from better-auth generated schema)
  impersonatedBy: text("impersonated_by"),
});

export const AccountTable = pgTable("account", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const VerificationTable = pgTable("verification", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

export const McpOAuthSessionTable = pgTable(
  "mcp_oauth_session",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    mcpServerId: uuid("mcp_server_id")
      .notNull()
      .references(() => McpServerTable.id, { onDelete: "cascade" }),
    serverUrl: text("server_url").notNull(),
    clientInfo: json("client_info"),
    tokens: json("tokens"),
    codeVerifier: text("code_verifier"),
    state: text("state").unique(), // OAuth state parameter for current flow (unique for security)
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("mcp_oauth_session_server_id_idx").on(t.mcpServerId),
    index("mcp_oauth_session_state_idx").on(t.state),
    // Partial index for sessions with tokens for better performance
    index("mcp_oauth_session_tokens_idx")
      .on(t.mcpServerId)
      .where(isNotNull(t.tokens)),
  ],
);

export type McpServerEntity = typeof McpServerTable.$inferSelect;
export type ChatThreadEntity = typeof ChatThreadTable.$inferSelect;
export type ChatMessageEntity = typeof ChatMessageTable.$inferSelect;

export type UserEntity = typeof UserTable.$inferSelect;
export type CreditTransactionEntity =
  typeof CreditTransactionTable.$inferSelect;

export const ChatShareTable = pgTable(
  "chat_share",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    title: text("title").notNull(),
    sharerId: uuid("sharer_id")
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    originalThreadId: uuid("original_thread_id"),
    messages: json("messages").notNull().$type<
      Array<{
        id: string;
        role: UIMessage["role"];
        parts: UIMessage["parts"];
        metadata?: ChatMetadata;
      }>
    >(),
    sharedAt: timestamp("shared_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    expiresAt: timestamp("expires_at"),
  },
  (t) => [index("chat_share_sharer_id_idx").on(t.sharerId)],
);

export const RedemptionCodeTable = pgTable("redemption_code", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  type: varchar("type", { enum: ["credits", "plan"] }).notNull(),
  credits: integer("credits"),
  plan: text("plan"),
  planDays: integer("plan_days"),
  planCredits: integer("plan_credits"),
  isUsed: boolean("is_used").notNull().default(false),
  usedBy: uuid("used_by").references(() => UserTable.id),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  createdBy: uuid("created_by").references(() => UserTable.id),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type RedemptionCodeEntity = typeof RedemptionCodeTable.$inferSelect;
