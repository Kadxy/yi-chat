import { BasicUser } from "app-types/user";
import { PLAN_LIMITS, type PlanLimits, type PlanName } from "app-types/plans";
import useSWR from "swr";
import { fetcher } from "lib/utils";

/**
 * Returns the current user's plan limits.
 * Reads user.plan from SWR cache and maps to PLAN_LIMITS.
 */
export function usePlanLimits(): PlanLimits {
  const { data: user } = useSWR<BasicUser>("/api/user/details", fetcher);
  const plan = (user?.plan as PlanName) || "free";
  return PLAN_LIMITS[plan];
}
