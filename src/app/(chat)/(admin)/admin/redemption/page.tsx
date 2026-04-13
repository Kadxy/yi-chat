import { requireAdminPermission } from "auth/permissions";
import { unauthorized } from "next/navigation";
import { redemptionRepository } from "lib/db/repository";
import { RedemptionCodeManagement } from "@/components/admin/redemption-code-management";

export const dynamic = "force-dynamic";

export default async function RedemptionCodesPage() {
  try {
    await requireAdminPermission();
  } catch {
    unauthorized();
  }

  const codes = await redemptionRepository.listCodes(50, 0);

  return <RedemptionCodeManagement initialCodes={codes} />;
}
