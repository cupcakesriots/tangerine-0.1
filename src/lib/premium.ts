// Premium tier management for Tangerine
// Handles premium state, trial banner, and upgrade flow
//
// Payment link integration:
// In production, PAYMENT_URL will be set via create_payment_link (Stripe).
// For now, it's a placeholder that can be swapped without touching component code.

import { useSyncExternalStore } from "react";

// ─── Constants ───────────────────────────────

/**
 * Premium payment URL — replace with Stripe payment link in production.
 * Set via `create_payment_link` when finance is configured.
 */
export const PREMIUM_PAYMENT_URL = "#upgrade-placeholder";

/** Monthly price in USD */
export const PREMIUM_MONTHLY_PRICE = 7.99;

/** Annual price in USD */
export const PREMIUM_ANNUAL_PRICE = 59.99;

/** Annual price shown as monthly equivalent */
export const PREMIUM_ANNUAL_MONTHLY = (PREMIUM_ANNUAL_PRICE / 12).toFixed(2);

/** Trial duration in days */
export const TRIAL_DURATION_DAYS = 14;

/** How long after dismissal the trial banner reappears (ms) */
const BANNER_REAPPEAR_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── localStorage Keys ────────────────────────

const PREMIUM_KEY = "tangerine_premium";
const TRIAL_START_KEY = "tangerine_trial_start";
const TRIAL_ACTIVE_KEY = "tangerine_trial_active";
const BANNER_DISMISSED_KEY = "tangerine_banner_dismissed";

// ─── State Accessors ──────────────────────────

function getPremiumFlag(): boolean {
  try {
    return localStorage.getItem(PREMIUM_KEY) === "true";
  } catch {
    return false;
  }
}

function setPremiumFlag(value: boolean): void {
  try {
    localStorage.setItem(PREMIUM_KEY, String(value));
    notifyListeners();
  } catch {
    /* noop */
  }
}

function getTrialStart(): number | null {
  try {
    const v = localStorage.getItem(TRIAL_START_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

function setTrialStart(ts: number): void {
  try {
    localStorage.setItem(TRIAL_START_KEY, String(ts));
    localStorage.setItem(TRIAL_ACTIVE_KEY, "true");
    notifyListeners();
  } catch {
    /* noop */
  }
}

function getTrialActive(): boolean {
  try {
    if (localStorage.getItem(TRIAL_ACTIVE_KEY) !== "true") return false;
    const start = getTrialStart();
    if (!start) return false;
    const elapsed = Date.now() - start;
    const trialMs = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
    return elapsed < trialMs;
  } catch {
    return false;
  }
}

function getBannerDismissedAt(): number | null {
  try {
    const v = localStorage.getItem(BANNER_DISMISSED_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

function setBannerDismissed(): void {
  try {
    localStorage.setItem(BANNER_DISMISSED_KEY, String(Date.now()));
    notifyListeners();
  } catch {
    /* noop */
  }
}

// ─── Reactivity ───────────────────────────────

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

// Listen for cross-tab changes
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (
      e.key &&
      [PREMIUM_KEY, TRIAL_START_KEY, TRIAL_ACTIVE_KEY, BANNER_DISMISSED_KEY].includes(
        e.key,
      )
    ) {
      notifyListeners();
    }
  });
}

// ─── Public API ───────────────────────────────

/** Check if the user currently has premium access (paid or active trial) */
export function isPremium(): boolean {
  return getPremiumFlag() || getTrialActive();
}

/** Start a free trial */
export function startTrial(): void {
  setTrialStart(Date.now());
}

/** Check if trial is currently active */
export function isTrialActive(): boolean {
  return getTrialActive();
}

/** Get remaining trial days (null if no trial) */
export function getTrialDaysLeft(): number | null {
  const start = getTrialStart();
  if (!start) return null;
  const elapsed = Date.now() - start;
  const remaining = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000 - elapsed;
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

/** Whether the trial banner should be shown */
export function shouldShowBanner(): boolean {
  if (isPremium()) return false;
  const dismissed = getBannerDismissedAt();
  if (!dismissed) return true;
  return Date.now() - dismissed > BANNER_REAPPEAR_MS;
}

/** Dismiss the trial banner */
export function dismissBanner(): void {
  setBannerDismissed();
}

// ─── React Hook ───────────────────────────────

export interface PremiumState {
  isPremium: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number | null;
  showBanner: boolean;
  startTrial: () => void;
  dismissBanner: () => void;
  monthlyPrice: number;
  annualPrice: number;
  annualMonthly: string;
  trialDuration: number;
  paymentUrl: string;
}

/**
 * usePremium — React hook that reactively tracks premium state.
 * Re-renders when premium status changes (e.g., trial started, cross-tab).
 */
export function usePremium(): PremiumState {
  const isPremiumState = useSyncExternalStore(subscribe, () => isPremium());
  const trialActive = useSyncExternalStore(subscribe, () => isTrialActive());
  const trialDaysLeft = useSyncExternalStore(subscribe, () => getTrialDaysLeft());
  const showBanner = useSyncExternalStore(subscribe, () => shouldShowBanner());

  return {
    isPremium: isPremiumState,
    isTrialActive: trialActive,
    trialDaysLeft,
    showBanner,
    startTrial,
    dismissBanner,
    monthlyPrice: PREMIUM_MONTHLY_PRICE,
    annualPrice: PREMIUM_ANNUAL_PRICE,
    annualMonthly: PREMIUM_ANNUAL_MONTHLY,
    trialDuration: TRIAL_DURATION_DAYS,
    paymentUrl: PREMIUM_PAYMENT_URL,
  };
}
// Premium tier gating feature branch
