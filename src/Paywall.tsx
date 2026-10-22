import React, { useState } from 'react';
import {
  Bookmark,
  Check,
  Crown,
  FolderHeart,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';

export type PlanId = 'weekly' | 'monthly' | 'six_month' | 'yearly';

export interface SubscriptionState {
  active: boolean;
  planId: PlanId;
  trialDays: number;
  startedAt: string;
  trialEndsAt: string;
  priceLabel: string;
}

export interface PlanOption {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  priceLabel: string;
  equivalent: string;
  badge?: string;
  badgeColor?: string;
  trialDays: number;
}

export const PAYWALL_PLANS: PlanOption[] = [
  {
    id: 'yearly',
    name: 'Annual Plan',
    price: '$99.99',
    period: '/ year',
    priceLabel: '$99.99/year',
    equivalent: 'Only $8.33/mo • Save 52%',
    badge: 'BEST VALUE',
    badgeColor: 'from-[#FE2C55] to-[#A855F7]',
    trialDays: 3
  },
  {
    id: 'six_month',
    name: '6-Month Plan',
    price: '$49.99',
    period: '/ 6 months',
    priceLabel: '$49.99 every 6 months',
    equivalent: 'Only $8.33/mo • Billed every 6 months',
    badge: 'GREAT VALUE',
    badgeColor: 'from-[#25F4EE] to-[#3B82F6]',
    trialDays: 3
  },
  {
    id: 'monthly',
    name: 'Monthly Plan',
    price: '$9.99',
    period: '/ month',
    priceLabel: '$9.99/month',
    equivalent: 'Billed monthly • Cancel anytime',
    badge: 'POPULAR',
    badgeColor: 'from-[#6366F1] to-[#8B5CF6]',
    trialDays: 3
  },
  {
    id: 'weekly',
    name: 'Weekly Plan',
    price: '$3.99',
    period: '/ week',
    priceLabel: '$3.99/week',
    equivalent: 'Flexible weekly access • Cancel anytime',
    badge: 'FLEXIBLE',
    badgeColor: 'from-slate-600 to-slate-500',
    trialDays: 3
  }
];

interface PaywallProps {
  /**
   * When true, acts as a Hard Paywall (no close/skip 'X' button; user must start trial or restore).
   * When false (e.g. opened from Settings), displays a close button.
   */
  isHardPaywall?: boolean;
  userName?: string;
  currentSubscription?: SubscriptionState | null;
  onStartTrial: (sub: SubscriptionState) => void;
  onRestorePurchases: () => boolean;
  onClose?: () => void;
}

export default function Paywall({
  isHardPaywall = true,
  userName,
  currentSubscription,
  onStartTrial,
  onRestorePurchases,
  onClose
}: PaywallProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>(
    currentSubscription?.planId || 'yearly'
  );
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | 'eula' | null>(null);

  const selectedPlan =
    PAYWALL_PLANS.find((p) => p.id === selectedPlanId) || PAYWALL_PLANS[0];

  const handleSubscribe = () => {
    setProcessing(true);
    setStatusMessage(null);
    setTimeout(() => {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + selectedPlan.trialDays * 24 * 60 * 60 * 1000);
      const sub: SubscriptionState = {
        active: true,
        planId: selectedPlan.id,
        trialDays: selectedPlan.trialDays,
        startedAt: now.toISOString(),
        trialEndsAt: trialEnd.toISOString(),
        priceLabel: selectedPlan.priceLabel
      };
      setProcessing(false);
      onStartTrial(sub);
    }, 600);
  };

  const handleRestore = () => {
    setProcessing(true);
    setStatusMessage(null);
    setTimeout(() => {
      const restored = onRestorePurchases();
      setProcessing(false);
      if (!restored) {
        setStatusMessage(
          'No previous active subscription found on this device. Select a plan above to start your 3-day free trial.'
        );
      }
    }, 500);
  };

  return (
    <div
      className="fixed inset-0 z-[65] bg-gradient-to-b from-[#0B0C10] via-[#101322] to-[#171226] overflow-y-auto text-slate-100 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <div
        className="max-w-xl mx-auto px-5 py-6 min-h-full flex flex-col justify-between"
        style={{
          paddingTop: 'max(24px, env(safe-area-inset-top))',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))'
        }}
      >
        {/* Top Bar (No Close button if Hard Paywall) */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FE2C55] to-[#25F4EE] p-[1.5px]">
              <div className="w-full h-full bg-[#0B0C10] rounded-[10px] flex items-center justify-center">
                <Bookmark className="w-4 h-4 text-[#25F4EE] fill-[#FE2C55]" />
              </div>
            </div>
            <span className="font-bold text-sm tracking-tight text-white">TokVault Pro</span>
          </div>

          {!isHardPaywall && onClose ? (
            <button
              onClick={onClose}
              aria-label="Close paywall"
              className="p-2 rounded-full bg-white/10 hover:bg-white/15 text-slate-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
              <Lock className="w-3 h-3 text-[#25F4EE]" /> Member Access Required
            </span>
          )}
        </div>

        {/* Hero Section */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#FE2C55]/20 via-purple-500/20 to-[#25F4EE]/20 border border-[#25F4EE]/40 text-[#25F4EE] text-xs font-extrabold uppercase tracking-widest mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#FE2C55]" />
            3-Day Free Trial on All Plans
          </div>

          <h1
            id="paywall-title"
            className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#25F4EE] bg-clip-text text-transparent leading-tight"
          >
            {userName
              ? `${userName}, Never Lose a TikTok Again`
              : 'Never Lose a Saved TikTok Again'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
            Save unlimited TikTok links, auto-fetch video previews & captions, organize custom folders, search by keyword, and back up to the cloud.
          </p>
        </div>

        {/* Value Props Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FE2C55]/20 text-[#FE2C55] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Unlimited Saves</p>
              <p className="text-[11px] text-slate-400 leading-tight">
                Auto-fetch video player, creator & hashtags
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#25F4EE]/20 text-[#25F4EE] flex items-center justify-center shrink-0">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Instant Deep Search</p>
              <p className="text-[11px] text-slate-400 leading-tight">
                Find any video by caption, tag, or personal note
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
              <FolderHeart className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Custom Collections</p>
              <p className="text-[11px] text-slate-400 leading-tight">
                Organize recipes, workouts, travel & ideas
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Cloud Backup & Sync</p>
              <p className="text-[11px] text-slate-400 leading-tight">
                Encrypted account backup across Web, iOS & Android
              </p>
            </div>
          </div>
        </div>

        {/* 4 Subscription Pricing Cards */}
        <div className="space-y-2.5 mb-5" role="radiogroup" aria-label="Subscription plans">
          {PAYWALL_PLANS.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`w-full text-left rounded-2xl p-3.5 transition relative flex items-center justify-between border-2 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#FE2C55]/15 via-purple-500/10 to-[#25F4EE]/15 border-[#25F4EE] shadow-lg shadow-[#25F4EE]/10'
                    : 'bg-[#141722]/90 border-white/10 hover:border-white/25'
                }`}
              >
                {plan.badge && (
                  <span
                    className={`absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white bg-gradient-to-r ${plan.badgeColor} shadow`}
                  >
                    {plan.badge}
                  </span>
                )}

                <div className="flex items-center gap-3 pr-2">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-[#25F4EE] bg-[#25F4EE]' : 'border-slate-500'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#0B0C10] stroke-[3]" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm sm:text-base text-white">
                        {plan.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                        {plan.trialDays} Days Free
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{plan.equivalent}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg sm:text-xl font-black text-white leading-none">
                    {plan.price}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                    {plan.period}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Primary CTA Button */}
        <div className="space-y-2.5">
          <button
            type="button"
            disabled={processing}
            onClick={handleSubscribe}
            className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#FE2C55] via-[#EC4899] to-[#8B5CF6] hover:from-[#FF3B63] hover:to-[#9333EA] text-white font-black text-base sm:text-lg shadow-xl shadow-[#FE2C55]/30 flex flex-col items-center justify-center transition transform active:scale-[0.99] cursor-pointer disabled:opacity-60"
          >
            <span className="flex items-center gap-2">
              <Crown className="w-5 h-5 fill-amber-300 text-amber-200" />
              {processing
                ? 'Activating Your Free Trial...'
                : `Click Here to Start ${selectedPlan.trialDays}-Day Free Trial`}
            </span>
            <span className="text-[11px] font-medium text-white/90 mt-0.5">
              $0.00 due today • Then {selectedPlan.priceLabel} • Cancel anytime
            </span>
          </button>

          {statusMessage && (
            <p
              role="status"
              className="text-xs text-center text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-xl p-2.5"
            >
              {statusMessage}
            </p>
          )}

          {/* Restore & Manage Links */}
          <div className="flex items-center justify-between px-2 pt-1 text-xs font-semibold text-slate-400">
            <button
              type="button"
              onClick={handleRestore}
              className="hover:text-white flex items-center gap-1.5 py-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#25F4EE]" />
              Restore Purchases
            </button>

            <button
              type="button"
              onClick={() => setLegalDoc('terms')}
              className="hover:text-white py-1 cursor-pointer"
            >
              Manage Subscription ↗
            </button>
          </div>
        </div>

        {/* Legal Auto-Renewal Terms */}
        <div className="mt-4 pt-3 border-t border-white/10 text-center space-y-2">
          <p className="text-[10px] leading-relaxed text-slate-400">
            After your {selectedPlan.trialDays}-day free trial, payment will be charged to your account unless canceled at least 24 hours before the end of the trial period. Subscription automatically renews at the selected rate ($3.99/week, $9.99/month, $49.99/6 months, or $99.99/year) unless auto-renew is turned off at least 24 hours before the end of the current period. Manage or cancel anytime in Account Settings.
          </p>
          <div className="flex items-center justify-center gap-3 text-[11px] font-semibold text-[#25F4EE]">
            <button type="button" onClick={() => setLegalDoc('terms')} className="hover:underline">
              Terms of Service
            </button>
            <span>•</span>
            <button type="button" onClick={() => setLegalDoc('eula')} className="hover:underline">
              Standard EULA
            </button>
            <span>•</span>
            <button type="button" onClick={() => setLegalDoc('privacy')} className="hover:underline">
              Privacy Policy
            </button>
          </div>
        </div>
      </div>

      {/* Legal Info Modal */}
      {legalDoc && (
        <div
          className="fixed inset-0 z-[75] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLegalDoc(null)}
        >
          <div
            className="bg-[#14161D] border border-[#2B3042] rounded-2xl max-w-md w-full p-5 space-y-3 text-xs text-slate-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">
                {legalDoc === 'terms'
                  ? 'Terms of Service & Subscriptions'
                  : legalDoc === 'eula'
                  ? 'Standard End User License Agreement (EULA)'
                  : 'Privacy Policy'}
              </h3>
              <button onClick={() => setLegalDoc(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="leading-relaxed text-slate-400">
              {legalDoc === 'privacy'
                ? 'TokVault stores your saved TikTok links, folders, tags, and personal notes locally on your device. If you choose to sign in with an account and use Cloud Backup, your encrypted backup payload is stored privately under your user ID with Row-Level Security.'
                : 'TokVault Pro subscriptions include a 3-day free trial. Available plans: Weekly ($3.99/week), Monthly ($9.99/month), 6-Month ($49.99 every 6 months), and Annual ($99.99/year). You may cancel your free trial or subscription at any time in your App Store, Google Play, or Web account settings at least 24 hours before the renewal date to avoid being charged.'}
            </p>
            <button
              onClick={() => setLegalDoc(null)}
              className="w-full py-2.5 rounded-xl bg-[#FE2C55] text-white font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
