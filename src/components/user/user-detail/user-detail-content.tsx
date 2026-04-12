import {
  getUser,
  getUserAccounts,
  getUserIdAndCheckAccess,
} from "lib/user/server";
import { notFound } from "next/navigation";
import { UserDetail } from "./user-detail";

export async function UserDetailContent({
  userId,
  view = "admin",
}: {
  userId?: string;
  view?: "admin" | "user";
}) {
  const currentUserId = await getUserIdAndCheckAccess(userId);

  const [user, userAccounts] = await Promise.all([
    getUser(userId),
    getUserAccounts(userId),
  ]);

  if (!user) {
    notFound();
  }

  return (
    <UserDetail
      view={view}
      user={user}
      currentUserId={currentUserId}
      userAccountInfo={userAccounts}
    />
  );
}
