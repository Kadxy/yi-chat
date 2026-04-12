"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Loader, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "auth/client";
import { useTranslations } from "next-intl";
import { SocialAuthenticationProvider } from "app-types/authentication";
import SocialProviders from "./social-providers";

type Step = "email" | "otp";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${"***"}${local[local.length - 1]}@${domain}`;
}

export default function AuthForm({
  socialAuthenticationProviders,
}: {
  socialAuthenticationProviders: SocialAuthenticationProvider[];
}) {
  const t = useTranslations("Auth");

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  useEffect(() => {
    // Suppress GSI FedCM AbortError that Next.js dev overlay catches
    // as unhandled rejection — this is a Google GSI internal issue
    const handleRejection = (e: PromiseRejectionEvent) => {
      if (e.reason instanceof DOMException && e.reason.name === "AbortError") {
        e.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handleRejection);

    let cancelled = false;

    authClient
      .oneTap({
        fetchOptions: {
          onSuccess: () => {
            if (!cancelled) {
              window.location.href = "/";
            }
          },
        },
      })
      .catch((error: unknown) => {
        // Ignore AbortError caused by React Strict Mode double-mount
        // or component unmount triggering FedCM request cancellation
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        if (
          error instanceof Error &&
          error.message?.includes("signal is aborted")
        ) {
          return;
        }
        console.error("Google One Tap error:", error);
      });

    return () => {
      cancelled = true;
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOTP = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t("SignIn.invalidEmail"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: "sign-in",
      });

      if (error) {
        toast.error(error.message || t("SignIn.sendOtpFailed"));
        return;
      }

      setStep("otp");
      startCooldown();
    } catch {
      toast.error(t("SignIn.sendOtpFailed"));
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = useCallback(
    async (code: string) => {
      if (code.length !== OTP_LENGTH) return;

      setLoading(true);
      try {
        const { error } = await authClient.signIn.emailOtp({
          email: email.trim(),
          otp: code,
        });

        if (error) {
          toast.error(error.message || t("SignIn.verifyOtpFailed"));
          setOtp("");
          return;
        }

        window.location.href = "/";
      } catch {
        toast.error(t("SignIn.verifyOtpFailed"));
        setOtp("");
      } finally {
        setLoading(false);
      }
    },
    [email, t],
  );

  const resendOTP = async () => {
    if (cooldown > 0) return;

    setLoading(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: "sign-in",
      });

      if (error) {
        toast.error(error.message || t("SignIn.sendOtpFailed"));
        return;
      }

      toast.success(t("SignIn.otpResent"));
      setOtp("");
      startCooldown();
    } catch {
      toast.error(t("SignIn.sendOtpFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = (provider: SocialAuthenticationProvider) => {
    authClient.signIn.social({ provider }).catch(() => {
      toast.error(t("SignIn.socialSignInFailed"));
    });
  };

  const goBackToEmail = () => {
    setStep("email");
    setOtp("");
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldown(0);
  };

  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (value.length === OTP_LENGTH) {
      verifyOTP(value);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 md:p-8 justify-center">
      <Card className="w-full md:max-w-md bg-background border-none mx-auto shadow-none animate-in fade-in duration-1000">
        <CardHeader className="my-4">
          <CardTitle className="text-2xl text-center my-1">
            {t("SignIn.title")}
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            {t("SignIn.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col">
          {step === "email" && (
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  autoFocus
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      sendOTP();
                    }
                  }}
                  type="email"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button className="w-full" onClick={sendOTP} disabled={loading}>
                {loading ? (
                  <Loader className="size-4 animate-spin" />
                ) : (
                  t("SignIn.continue")
                )}
              </Button>

              {socialAuthenticationProviders.length > 0 && (
                <>
                  <div className="flex items-center">
                    <div className="flex-1 h-px bg-accent" />
                    <span className="px-4 text-sm text-muted-foreground">
                      {t("SignIn.orContinueWith")}
                    </span>
                    <div className="flex-1 h-px bg-accent" />
                  </div>
                  <SocialProviders
                    socialAuthenticationProviders={
                      socialAuthenticationProviders
                    }
                    onSocialProviderClick={handleSocialSignIn}
                  />
                </>
              )}
            </div>
          )}

          {step === "otp" && (
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label>{t("SignIn.verificationCode")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("SignIn.otpSentTo", { email: maskEmail(email) })}
                </p>
                <InputOTP
                  maxLength={OTP_LENGTH}
                  value={otp}
                  onChange={handleOtpChange}
                  disabled={loading}
                  autoFocus
                  containerClassName="justify-center"
                >
                  <InputOTPGroup>
                    {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                className="w-full"
                onClick={() => verifyOTP(otp)}
                disabled={loading || otp.length !== OTP_LENGTH}
              >
                {loading ? (
                  <Loader className="size-4 animate-spin" />
                ) : (
                  t("SignIn.signIn")
                )}
              </Button>

              <div className="flex items-center justify-between">
                <button
                  onClick={goBackToEmail}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="size-3" />
                  {t("Common.back")}
                </button>
                <button
                  onClick={resendOTP}
                  disabled={cooldown > 0 || loading}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cooldown > 0
                    ? t("SignIn.resendIn", { seconds: cooldown })
                    : t("SignIn.resendCode")}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
