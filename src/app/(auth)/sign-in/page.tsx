import AuthForm from "@/components/auth/auth-form";
import { getAuthConfig } from "lib/auth/config";

export default function SignInPage() {
  const { socialAuthenticationProviders } = getAuthConfig();
  const enabledProviders = (
    Object.keys(
      socialAuthenticationProviders,
    ) as (keyof typeof socialAuthenticationProviders)[]
  ).filter((key) => socialAuthenticationProviders[key]);
  return <AuthForm socialAuthenticationProviders={enabledProviders} />;
}
