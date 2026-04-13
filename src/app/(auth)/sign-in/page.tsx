import AuthForm from "@/components/auth/auth-form";
import { getAuthConfig } from "lib/auth/config";
import type { Metadata } from "next";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Yi Chat";

export const metadata: Metadata = {
  title: `Sign In - ${APP_NAME}`,
  alternates: {
    canonical: "/sign-in",
  },
};

export default function SignInPage() {
  const { socialAuthenticationProviders } = getAuthConfig();
  const enabledProviders = (
    Object.keys(
      socialAuthenticationProviders,
    ) as (keyof typeof socialAuthenticationProviders)[]
  ).filter((key) => socialAuthenticationProviders[key]);
  return <AuthForm socialAuthenticationProviders={enabledProviders} />;
}
