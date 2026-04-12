import { notFound, redirect, unauthorized } from "next/navigation";
import { getUserAccounts, getUser } from "lib/user/server";
import { UserDetail } from "@/components/user/user-detail/user-detail";
import { getSession } from "auth/server";
import { requireAdminPermission } from "auth/permissions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params;
  try {
    await requireAdminPermission();
  } catch (_error) {
    unauthorized();
  }
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const [user, userAccountInfo] = await Promise.all([
    getUser(id),
    getUserAccounts(id),
  ]);

  if (!user) {
    notFound();
  }

  return (
    <UserDetail
      user={user}
      currentUserId={session.user.id}
      userAccountInfo={userAccountInfo}
      view="admin"
    />
  );
}
