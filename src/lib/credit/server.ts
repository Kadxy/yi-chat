"use server";

import { creditRepository } from "lib/db/repository";
import { getUserIdAndCheckAccess } from "lib/user/server";

export async function getCreditTransactions(userId?: string) {
  const resolvedUserId = await getUserIdAndCheckAccess(userId);
  return await creditRepository.getTransactions(resolvedUserId, 100);
}

export async function getCreditBalance(userId?: string) {
  const resolvedUserId = await getUserIdAndCheckAccess(userId);
  return await creditRepository.getBalance(resolvedUserId);
}
