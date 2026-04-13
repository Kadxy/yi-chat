import { Suspense } from "react";
import { getCreditBalance, getCreditTransactions } from "@/lib/credit/server";
import { UsagePageContent } from "@/components/usage/usage-page-content";
import { Skeleton } from "ui/skeleton";

async function UsageContent() {
  const [transactions, { balance, plan, planExpiresAt }] = await Promise.all([
    getCreditTransactions(),
    getCreditBalance(),
  ]);

  return (
    <UsagePageContent
      transactions={transactions}
      balance={balance}
      plan={plan}
      planExpiresAt={planExpiresAt?.toISOString() ?? null}
    />
  );
}

function UsageSkeleton() {
  return (
    <div className="min-h-full p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}

export default function UsagePage() {
  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <Suspense fallback={<UsageSkeleton />}>
        <UsageContent />
      </Suspense>
    </div>
  );
}
