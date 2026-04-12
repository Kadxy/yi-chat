"use server";

import { creditRepository } from "lib/db/repository";
import { getUserIdAndCheckAccess } from "lib/user/server";

const PAGE_SIZE = 50;

export async function getCreditTransactions(userId?: string, offset = 0) {
  const resolvedUserId = await getUserIdAndCheckAccess(userId);
  return await creditRepository.getTransactions(
    resolvedUserId,
    PAGE_SIZE,
    offset,
  );
}

export async function getCreditBalance(userId?: string) {
  const resolvedUserId = await getUserIdAndCheckAccess(userId);
  return await creditRepository.getBalance(resolvedUserId);
}
