import { Suspense } from "react";
import { UserDetailContent } from "@/components/user/user-detail/user-detail-content";
import { UserDetailContentSkeleton } from "@/components/user/user-detail/user-detail-content-skeleton";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <Suspense fallback={<UserDetailContentSkeleton />}>
        <UserDetailContent view="user" />
      </Suspense>
    </div>
  );
}
