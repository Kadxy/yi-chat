"use client";

import { createAuthClient } from "better-auth/react"; // make sure to import from better-auth/react
import {
  adminClient,
  inferAdditionalFields,
  oneTapClient,
} from "better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";

import { DEFAULT_USER_ROLE, USER_ROLES } from "app-types/roles";
import { ac, admin, user } from "./roles";
import type { auth } from "./auth-instance";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),
    adminClient({
      defaultRole: DEFAULT_USER_ROLE,
      adminRoles: [USER_ROLES.ADMIN],
      ac,
      roles: {
        admin,
        user,
      },
    }),
    emailOTPClient(),
    oneTapClient({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    }),
  ],
});
