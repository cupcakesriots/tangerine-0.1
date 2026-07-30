// Premium tier management stub — full implementation on feature/premium-gating-upgrade branch
// This minimal stub unblocks the main branch build.

import { useSyncExternalStore } from "react";

export const PREMIUM_PAYMENT_URL = "#upgrade-placeholder";
export const PREMIUM_MONTHLY_PRICE = 7.99;
export const PREMIUM_ANNUAL_PRICE = 59.99;
export const PREMIUM_ANNUAL_MONTHLY = (PREMIUM_ANNUAL_PRICE / 12).toFixed(2);
export const TRIAL_DURATION_DAYS = 14;

export function isPremium(): boolean { return false; }
export function startTrial(): void {}
export function isTrialActive(): boolean { return false; }
export function getTrialDaysLeft(): number | null { return null; }
export function shouldShowBanner(): boolean { return false; }
export function dismissBanner(): void {}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }

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

export function usePremium(): PremiumState {
  const isPremiumState = useSyncExternalStore(subscribe, () => false);
  const trialActive = useSyncExternalStore(subscribe, () => false);
  const trialDaysLeftVal = useSyncExternalStore(subscribe, () => null as number | null);
  const showBannerVal = useSyncExternalStore(subscribe, () => false);

  return {
    isPremium: isPremiumState,
    isTrialActive: trialActive,
    trialDaysLeft: trialDaysLeftVal,
    showBanner: showBannerVal,
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
