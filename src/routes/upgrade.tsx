import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppLayout } from "~/components/AppLayout";
import { isOnboardingComplete } from "~/lib/storage";
import { usePremium } from "~/lib/premium";

export const Route = createFileRoute("/upgrade")({
  component: UpgradePage,
});

const freemiumFeatures = [
  "Basic task management",
  "Multi-view boards (List, Kanban, Gantt, Grid, Timeline)",
  "Onboarding profile & energy tracking",
  "Manual wellness logging",
  "2 wellness experiences",
  "Basic AI Coach (limited sessions)",
];

const premiumFeatures = [
  "Continuous AI Coach access",
  "Live calendar sync (Google Calendar, Slack)",
  "Fitness tracker sync (Apple Health, Garmin)",
  "Advanced energy forecasting",
  "Full Move, Stretch & Strengthen library",
  "All 6 guided reset experiences",
];

function UpgradePage() {
  const navigate = useNavigate();
  const premium = usePremium();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");
  const [ready, setReady] = useState(false);
  const [showTrialStarted, setShowTrialStarted] = useState(false);

  useEffect(() => {
    if (!isOnboardingComplete()) {
      navigate({ to: "/", replace: true });
      return;
    }
    if (premium.isPremium && !premium.isTrialActive) {
      // Already a paid premium user
    }
    setReady(true);
  }, []);

  const handleStartTrial = () => {
    premium.startTrial();
    setShowTrialStarted(true);
  };

  if (!ready) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <div className="animate-float text-4xl">🍊</div>
        </div>
      </AppLayout>
    );
  }

  if (showTrialStarted) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-lg py-12 text-center">
          <div className="card-elevated slide-up space-y-6 px-8 py-12">
            <span className="text-5xl">🍊</span>
            <div>
              <h1 className="font-serif text-2xl font-semibold tracking-tight text-brand-dark">
                Your trial has started
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                You have {premium.trialDuration} days to explore everything Tangerine has to offer.
                No pressure — take your time and discover what works for you.
              </p>
            </div>
            <div className="rounded-xl bg-brand-warm/40 px-6 py-4">
              <p className="text-sm font-medium text-brand-dark">
                {premium.trialDaysLeft} {premium.trialDaysLeft === 1 ? "day" : "days"} remaining in your trial
              </p>
            </div>
            <Link to="/dashboard" className="btn-primary inline-block w-full">
              Start exploring →
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (premium.isPremium && !premium.isTrialActive) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-lg py-12 text-center">
          <div className="card-elevated space-y-4 px-8 py-12">
            <span className="text-5xl">✨</span>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-brand-dark">
              You're a Premium member
            </h1>
            <p className="text-sm leading-relaxed text-brand-muted">
              Thank you for supporting Tangerine. You have full access to all features.
            </p>
            <Link to="/dashboard" className="btn-primary inline-block w-full">
              Back to dashboard →
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-10 py-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
            A gentle invitation
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-brand-muted sm:text-base">
            Premium is here when you're ready. It unlocks deeper coaching,
            calendar sync, and the full wellness library — all in the same calm space.
          </p>
          {premium.isTrialActive && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-warm/50 px-4 py-1.5">
              <span className="text-sm font-medium text-brand-deep">
                ✨ {premium.trialDaysLeft} {premium.trialDaysLeft === 1 ? "day" : "days"} left in your trial
              </span>
            </div>
          )}
        </div>

        {/* Plan selector */}
        <div className="mx-auto flex max-w-sm rounded-2xl bg-brand-cream/40 p-1">
          <button
            onClick={() => setSelectedPlan("monthly")}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              selectedPlan === "monthly"
                ? "bg-white text-brand-dark shadow-sm"
                : "text-brand-muted hover:text-brand-dark"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setSelectedPlan("annual")}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              selectedPlan === "annual"
                ? "bg-white text-brand-dark shadow-sm"
                : "text-brand-muted hover:text-brand-dark"
            }`}
          >
            Annual
          </button>
        </div>

        {/* Pricing card */}
        <div className="card-elevated overflow-hidden">
          <div className="bg-gradient-to-br from-brand-deep via-brand-light to-brand-gold px-8 py-10 text-center text-white">
            <span className="text-sm font-medium uppercase tracking-widest text-white/70">
              Premium
            </span>
            <div className="mt-3 flex items-baseline justify-center gap-1">
              <span className="font-serif text-5xl font-semibold tracking-tight">
                ${selectedPlan === "monthly" ? premium.monthlyPrice : premium.annualMonthly}
              </span>
              <span className="text-lg text-white/70">/mo</span>
            </div>
            {selectedPlan === "annual" && (
              <p className="mt-1 text-sm text-white/70">
                ${premium.annualPrice}/yr billed annually — save{" "}
                {Math.round(((premium.monthlyPrice * 12 - premium.annualPrice) / (premium.monthlyPrice * 12)) * 100)}%
              </p>
            )}
            <button
              onClick={handleStartTrial}
              className="btn-primary mt-6 w-full bg-white text-brand-deep hover:bg-white/90 hover:text-brand-deep"
            >
              ✨ Start {premium.trialDuration}-day free trial
            </button>
            <p className="mt-3 text-xs text-white/50">
              No charge until trial ends. Cancel anytime.
            </p>
          </div>
        </div>

        {/* Feature comparison */}
        <div>
          <h2 className="mb-6 text-center font-serif text-xl font-semibold text-brand-dark">
            What's included
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Freemium */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-cream/30 text-sm">
                  🍊
                </span>
                <div>
                  <h3 className="font-serif text-base font-medium text-brand-dark">Free</h3>
                  <p className="text-xs text-brand-muted">Always available</p>
                </div>
              </div>
              <ul className="space-y-2">
                {freemiumFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-brand-dark/70">
                    <span className="mt-0.5 shrink-0 text-brand-deep">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium */}
            <div className="card bg-gradient-to-br from-brand-warm/40 to-white space-y-4 border-brand-light/20">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-deep text-sm text-white shadow-sm">
                  ✨
                </span>
                <div>
                  <h3 className="font-serif text-base font-medium text-brand-dark">Premium</h3>
                  <p className="text-xs text-brand-muted">
                    ${selectedPlan === "monthly" ? premium.monthlyPrice : premium.annualMonthly}/mo
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                {premiumFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-brand-dark/70">
                    <span className="mt-0.5 shrink-0 text-brand-deep">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Gentle reassurance */}
        <div className="card-glass text-center px-8 py-6">
          <p className="font-serif text-base italic leading-relaxed text-brand-dark/60">
            "You can cancel anytime. Tangerine will still be here — free, calm, and ready when you are."
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
