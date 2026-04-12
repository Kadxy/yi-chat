// Base auth instance without "server-only" - can be used in seed scripts
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin, emailOTP, oneTap } from "better-auth/plugins";
import { pgDb } from "lib/db/pg/db.pg";
import { headers } from "next/headers";
import {
  AccountTable,
  SessionTable,
  UserTable,
  VerificationTable,
} from "lib/db/pg/schema.pg";
import { getAuthConfig } from "./config";
import logger from "logger";
import { DEFAULT_USER_ROLE, USER_ROLES } from "app-types/roles";
import { DEFAULT_PLAN, SIGNUP_CREDITS } from "app-types/plans";
import { admin, user, ac } from "./roles";
import { sendOTPEmail } from "lib/email";

const { socialAuthenticationProviders } = getAuthConfig();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const options = {
  secret: process.env.BETTER_AUTH_SECRET!,
  plugins: [
    adminPlugin({
      defaultRole: DEFAULT_USER_ROLE,
      adminRoles: [USER_ROLES.ADMIN],
      ac,
      roles: {
        admin,
        user,
      },
    }),
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      async sendVerificationOTP({ email, otp, type }) {
        logger.info(`Sending OTP to ${email}, type: ${type}`);
        await sendOTPEmail(email, otp);
      },
    }),
    oneTap(),
    nextCookies(),
  ],
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BASE_URL,
  user: {
    changeEmail: {
      enabled: false,
    },
    deleteUser: {
      enabled: true,
    },
  },
  database: drizzleAdapter(pgDb, {
    provider: "pg",
    schema: {
      user: UserTable,
      session: SessionTable,
      account: AccountTable,
      verification: VerificationTable,
    },
  }),
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const role =
            ADMIN_EMAIL && user.email === ADMIN_EMAIL
              ? USER_ROLES.ADMIN
              : DEFAULT_USER_ROLE;

          const name = user.name || user.email.split("@")[0];

          logger.info(`User creation hook: ${user.email} → role: ${role}`);

          return {
            data: {
              ...user,
              name,
              role,
              plan: DEFAULT_PLAN,
              creditBalance: SIGNUP_CREDITS,
            },
          };
        },
        after: async (user) => {
          // Log the signup credit transaction
          try {
            const { pgCreditRepository } = await import(
              "lib/db/pg/repositories/credit-repository.pg"
            );
            await pgCreditRepository.logTransaction({
              userId: user.id,
              amount: SIGNUP_CREDITS,
              balanceAfter: SIGNUP_CREDITS,
              type: "signup",
              description: "Signup bonus",
            });
          } catch (e) {
            logger.error("Failed to log signup credit transaction:", e);
          }
        },
      },
    },
  },
  emailAndPassword: {
    enabled: false,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60,
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
  },
  advanced: {
    useSecureCookies:
      process.env.NO_HTTPS == "1"
        ? false
        : process.env.NODE_ENV === "production",
    database: {
      generateId: false,
    },
  },
  account: {
    accountLinking: {
      trustedProviders: (
        Object.keys(
          socialAuthenticationProviders,
        ) as (keyof typeof socialAuthenticationProviders)[]
      ).filter((key) => socialAuthenticationProviders[key]),
    },
  },
  socialProviders: socialAuthenticationProviders,
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...options,
  plugins: [...(options.plugins ?? [])],
});

export const getSession = async () => {
  const reqHeaders = await headers();
  try {
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });
    return session ?? null;
  } catch (error) {
    logger.error("Error getting session:", error);
    return null;
  }
};
