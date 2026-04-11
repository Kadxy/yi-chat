import { PLAN_CONFIGS, type PlanName } from "app-types/plans";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plans - Yi Chat",
  description: "Choose the right plan for you.",
};

const PLAN_COPY: Record<
  PlanName,
  {
    price: string;
    cta: string;
    highlighted?: boolean;
    badge?: string;
    inherits?: string;
    features: string[];
  }
> = {
  free: {
    price: "¥0 / month",
    cta: "Get Started",
    features: [
      "Haiku 4.5",
      "300 credits on sign-up",
      "Daily sign-in rewards",
      "File & image analysis",
      "MCP integrations",
    ],
  },
  plus: {
    price: `¥${PLAN_CONFIGS.plus.price} / month`,
    cta: "Upgrade",
    inherits: "Everything in Free",
    features: [
      "Sonnet 4.6",
      `${PLAN_CONFIGS.plus.monthlyCredits.toLocaleString()} credits / month`,
      "Longer conversations",
    ],
  },
  pro: {
    price: `¥${PLAN_CONFIGS.pro.price} / month`,
    cta: "Upgrade",
    highlighted: true,
    badge: "Popular",
    inherits: "Everything in Plus",
    features: [
      "Opus 4.6",
      `${PLAN_CONFIGS.pro.monthlyCredits.toLocaleString()} credits / month`,
      "All models available",
    ],
  },
  max: {
    price: `¥${PLAN_CONFIGS.max.price} / month`,
    cta: "Upgrade",
    badge: "Limited",
    inherits: "Everything in Pro",
    features: [
      `${PLAN_CONFIGS.max.monthlyCredits.toLocaleString()} credits / month`,
      "Priority access",
      "Early access to new features",
    ],
  },
};

const PLAN_ORDER: PlanName[] = ["free", "plus", "pro", "max"];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M11.5 3.5L5.5 10L2.5 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[960px] px-5 sm:px-8 pt-12 pb-20 md:pt-20">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-[1.75rem] font-bold tracking-[-0.02em] leading-tight">
            Explore plans
          </h1>
          <p className="text-[0.9375rem] text-muted-foreground mt-1.5 leading-relaxed">
            Compare all Yi Chat plans
          </p>
        </header>

        {/* Plans comparison */}
        <section>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70 mb-5">
            Compare all plans
          </p>

          {/* Plan headers */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-b border-border pb-8 gap-y-10">
            {PLAN_ORDER.map((plan) => {
              const config = PLAN_CONFIGS[plan];
              const copy = PLAN_COPY[plan];
              return (
                <div key={plan} className="flex flex-col pr-6">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-[0.9375rem] font-semibold leading-snug">
                      {config.label}
                    </h3>
                    {copy.badge && (
                      <span
                        className={[
                          "text-[0.6875rem] font-medium leading-none px-1.5 py-[3px] rounded-sm",
                          copy.highlighted
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                            : "bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        {copy.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-[0.8125rem] text-muted-foreground leading-relaxed mb-4">
                    {copy.price}
                  </p>

                  <Link
                    href="/sign-in"
                    className={[
                      "inline-flex items-center justify-center",
                      "text-[0.8125rem] font-medium leading-none",
                      "h-[30px] px-3 rounded-[6px] w-fit",
                      "transition-all duration-150",
                      copy.highlighted
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                        : "border border-border/80 text-foreground/80 hover:bg-accent hover:text-foreground",
                    ].join(" ")}
                  >
                    {copy.cta}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 pt-7 gap-y-10">
            {PLAN_ORDER.map((plan) => {
              const copy = PLAN_COPY[plan];
              return (
                <div key={plan} className="pr-6">
                  <p className="text-[0.8125rem] font-semibold mb-3 leading-snug">
                    {copy.inherits || "Highlights"}
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    {copy.features.map((text) => (
                      <li key={text} className="flex items-start gap-2 min-w-0">
                        <CheckIcon className="size-[14px] mt-[3px] shrink-0 text-foreground/40" />
                        <span className="text-[0.8125rem] leading-snug text-muted-foreground">
                          {text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-14 pt-7 border-t border-border">
          <p className="text-[0.8125rem] text-muted-foreground/60 leading-relaxed">
            Credits never expire. Top up anytime at ¥10 / 1,000 credits. All
            plans include daily sign-in rewards.
          </p>
        </footer>
      </div>
    </div>
  );
}
