"use client";

import { useActionState, useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "ui/card";
import { Label } from "ui/label";
import { Input } from "ui/input";
import { Badge } from "ui/badge";
import { User } from "lucide-react";
import { toast } from "sonner";
import Form from "next/form";
import { updateUserDetailsAction } from "@/app/api/user/actions";
import { UpdateUserActionState } from "@/app/api/user/validations";
import { BasicUserWithLastLogin } from "app-types/user";
import { getUserAvatar } from "lib/user/utils";
import { SubmitButton } from "./user-submit-button";
import { useProfileTranslations } from "@/hooks/use-profile-translations";
import { UserAvatarUpload } from "./user-avatar-upload";

interface UserDetailFormCardProps {
  user: BasicUserWithLastLogin;
  currentUserId: string;
  onUserDetailsUpdate?: (user: Partial<BasicUserWithLastLogin>) => void;
  view?: "admin" | "user";
}

export function UserDetailFormCard({
  user,
  currentUserId,
  onUserDetailsUpdate,
  view,
}: UserDetailFormCardProps) {
  const { t, tCommon } = useProfileTranslations(view);
  const [currentUser, setCurrentUser] = useState(user);

  const [, detailsUpdateFormAction, isPending] = useActionState<
    UpdateUserActionState,
    FormData
  >(async (prevState, formData) => {
    const result = await updateUserDetailsAction(prevState, formData);
    if (result?.success && result.user) {
      const updatedUser = result.user;
      toast.success(t("updateSuccess"));
      setCurrentUser(updatedUser);
      onUserDetailsUpdate?.(updatedUser);
    } else {
      toast.error(result?.message || t("updateError"));
    }
    return result;
  }, {});

  const handleImageUpdate = (imageUrl: string) => {
    setCurrentUser((prev) => ({ ...prev, image: imageUrl }));
    onUserDetailsUpdate?.({ image: imageUrl });
  };
  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          {tCommon("userDetailsCardTitle")}
          {user.id === currentUserId && (
            <Badge variant="outline" className="text-xs ml-auto">
              {tCommon("you")}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{t("userDetailsCardDescription")}</CardDescription>
      </CardHeader>

      <CardContent className="h-full">
        <Form
          action={detailsUpdateFormAction}
          className="space-y-6 h-full flex flex-col"
        >
          <input type="hidden" name="userId" value={user.id} />

          {/* Avatar Upload Section */}
          <div className="flex items-center justify-center gap-4 my-4">
            <UserAvatarUpload
              userId={user.id}
              currentImageUrl={getUserAvatar(currentUser)}
              userName={currentUser.name}
              onImageUpdate={handleImageUpdate}
              disabled={isPending}
            />
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{tCommon("name")}</Label>
              <Input
                id="name"
                name="name"
                defaultValue={currentUser.name}
                required
                disabled={isPending}
                data-testid="user-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{tCommon("email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={currentUser.email}
                disabled
                required
                data-testid="user-email-input"
              />
            </div>
          </div>

          {/* Account Information */}
          <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {tCommon("joined")}
              </Label>
              <p className="text-sm font-medium" data-testid="user-created-at">
                {format(new Date(currentUser.createdAt), "PPP")}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {tCommon("lastUpdated")}
              </Label>
              <p className="text-sm font-medium" data-testid="user-updated-at">
                {format(new Date(currentUser.updatedAt), "PPP")}
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-4">
            <SubmitButton
              className="w-full"
              data-testid="save-changes-button"
              disabled={isPending}
            >
              {isPending ? tCommon("saving") : t("saveChanges")}
            </SubmitButton>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
