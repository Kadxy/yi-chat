export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
} as const;
export type UserRoleNames = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const DEFAULT_USER_ROLE: UserRoleNames = USER_ROLES.USER;

export type UserRolesInfo = Record<
  UserRoleNames,
  {
    label: string;
    description: string;
  }
>;

export const userRolesInfo: UserRolesInfo = {
  admin: {
    label: "Admin",
    description: "Admin user can manage the app",
  },
  user: {
    label: "User",
    description: "Default role for all users",
  },
};
