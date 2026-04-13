"use client";

import { BasicUserWithLastLogin } from "app-types/user";
import { UserDetailFormCard } from "./user-detail-form-card";
import { UserAccessCard } from "./user-access-card";
import { UserCreditPlanCard } from "./user-credit-plan-card";
import { UserChatHistoryCard } from "./user-chat-history-card";
import { useProfileTranslations } from "@/hooks/use-profile-translations";
import { useSidebar } from "ui/sidebar";
import useSWR, { mutate } from "swr";
import { cn, fetcher } from "lib/utils";

interface UserDetailProps {
  user: BasicUserWithLastLogin;
  currentUserId: string;
  userAccountInfo?: {
    hasPassword: boolean;
    oauthProviders: string[];
  };
  view?: "admin" | "user";
}

export function UserDetail({
  view,
  user: initialUser,
  currentUserId,
  userAccountInfo,
}: UserDetailProps) {
  const { open: sidebarOpen } = useSidebar();
  const userDetailRoute =
    currentUserId === initialUser.id
      ? `/api/user/details`
      : `/api/user/details/${initialUser.id}`;
  const { data: user } = useSWR<BasicUserWithLastLogin>(
    userDetailRoute,
    fetcher,
    {
      fallbackData: initialUser,
      revalidateOnMount: false,
    },
  );
  const handleUserUpdate = async (
    updatedUser: Partial<BasicUserWithLastLogin>,
  ) => {
    if (user) {
      mutate<BasicUserWithLastLogin>(userDetailRoute, {
        ...user,
        ...updatedUser,
      });
    }
  };
  const { t } = useProfileTranslations(view);

  return (
    <div
      className="min-h-full p-4 md:p-6 space-y-6"
      data-testid="user-detail-content"
    >
      {/* Hero Section */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{user?.name}</h1>
        <p className="text-muted-foreground">{t("userDetailDescription")}</p>
      </div>

      {/* Cards Layout */}
      <div
        className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", {
          "grid-cols-1 md:grid-cols-1 lg:grid-cols-2": sidebarOpen,
        })}
      >
        {/* Top Row: User Details Form & Access & Account */}
        <UserDetailFormCard
          user={user ?? initialUser}
          currentUserId={currentUserId}
          view={view}
          onUserDetailsUpdate={handleUserUpdate}
        />

        <UserAccessCard
          user={user ?? initialUser}
          currentUserId={currentUserId}
          userAccountInfo={userAccountInfo}
          view={view}
          onUserDetailsUpdate={handleUserUpdate}
        />

        {view === "admin" && (
          <UserCreditPlanCard
            user={user ?? initialUser}
            onUserDetailsUpdate={handleUserUpdate}
          />
        )}

        {view === "admin" && <UserChatHistoryCard userId={initialUser.id} />}
      </div>
    </div>
  );
}
