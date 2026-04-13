import { pgChatRepository } from "./pg/repositories/chat-repository.pg";
import { pgUserRepository } from "./pg/repositories/user-repository.pg";
import { pgMcpRepository } from "./pg/repositories/mcp-repository.pg";
import { pgMcpOAuthRepository } from "./pg/repositories/mcp-oauth-repository.pg";
import { pgChatShareRepository } from "./pg/repositories/chat-share-repository.pg";
import { pgCreditRepository } from "./pg/repositories/credit-repository.pg";
import { pgRedemptionRepository } from "./pg/repositories/redemption-repository.pg";

export const chatRepository = pgChatRepository;
export const userRepository = pgUserRepository;
export const mcpRepository = pgMcpRepository;
export const mcpOAuthRepository = pgMcpOAuthRepository;
export const chatShareRepository = pgChatShareRepository;
export const creditRepository = pgCreditRepository;
export const redemptionRepository = pgRedemptionRepository;
