import {
  GoogleConfigSchema,
  GoogleConfig,
  AuthConfig,
  AuthConfigSchema,
} from "app-types/authentication";
// Conditionally import React taint
let experimental_taintUniqueValue: any = () => {};
try {
  // Only use taint in Next.js runtime
  if (typeof window !== "undefined" || process.env.NEXT_RUNTIME) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const react = require("react");
    experimental_taintUniqueValue = react.experimental_taintUniqueValue;
  }
} catch (_e) {
  // No-op for non-React contexts
}

function parseSocialAuthConfigs() {
  const configs: {
    google?: GoogleConfig;
  } = {};

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const googleConfig: GoogleConfig = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };

    const googleResult = GoogleConfigSchema.safeParse(googleConfig);
    if (googleResult.success) {
      configs.google = googleResult.data;
      experimental_taintUniqueValue(
        "Do not pass GOOGLE_CLIENT_SECRET to the client",
        configs,
        configs.google.clientSecret,
      );
    }
  }

  return configs;
}

export function getAuthConfig(): AuthConfig {
  const rawConfig = {
    emailAndPasswordEnabled: true,
    signUpEnabled: true,
    socialAuthenticationProviders: parseSocialAuthConfigs(),
  };

  const result = AuthConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    throw new Error(`Invalid auth configuration: ${result.error.message}`);
  }

  return result.data;
}
