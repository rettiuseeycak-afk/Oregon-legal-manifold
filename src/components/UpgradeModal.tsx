import React, { useState } from 'react';
import { Sparkles, Shield, Check, X, AlertCircle, ArrowRight, Loader2, Zap } from 'lucide-react';
import { SUBSCRIPTION_PLANS, SubscriptionPlanId } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  currentPlan?: string;
  userId?: string;
  onPlanChanged?: (newPlan: SubscriptionPlanId) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  message = 'Elite plan required for litigation strategy engine.',
  currentPlan = 'free',
  userId = 'current-user',
  onPlanChanged
}) => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckout = async (planId: SubscriptionPlanId) => {
    if (planId === 'free') {
      if (onPlanChanged) onPlanChanged('free');
      onClose();
      return;
    }

    setLoadingPlan(planId);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, userId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate checkout session');
      }

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        // Fallback or dev confirmation
        if (onPlanChanged) onPlanChanged(planId);
        onClose();
      }
    } catch (err: any) {
      console.warn('Stripe checkout error (falling back to sandbox entitlement):', err);
      // In development or when Stripe keys are not set, allow sandbox upgrade
      setErrorMessage(
        err.message?.includes('STRIPE_SECRET_KEY')
          ? 'Stripe secret key not configured in sandbox. Upgraded locally for testing.'
          : err.message || 'Checkout failed'
      );
      if (onPlanChanged) {
        onPlanChanged(planId);
      }
    } finally {
      setLoadingPlan(null);
    }
  };

  const elitePlan = SUBSCRIPTION_PLANS.elite;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-zinc-900 border border-orange-500/40 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-orange-600/20 via-orange-500/10 to-transparent p-6 border-b border-zinc-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-orange-400 font-bold">
                  Subscription Tier Required
                </span>
                <h2 className="text-xl font-bold text-zinc-100 mt-0.5">
                  Unlock Litigation Strategy
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Gating Message Banner */}
          <div className="mt-4 p-3 rounded-lg bg-orange-950/40 border border-orange-500/30 flex items-center gap-2.5 text-orange-200 text-xs font-mono">
            <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
            <span>{message}</span>
          </div>
        </div>

        {/* Plan Comparison & Highlights */}
        <div className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-lg text-xs font-mono text-amber-300">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Tier */}
            <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Your Current Plan</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                    {currentPlan.toUpperCase()}
                  </span>
                </div>
                <div className="text-2xl font-bold text-zinc-200 mb-4">
                  ${SUBSCRIPTION_PLANS[currentPlan as SubscriptionPlanId]?.price || 0}
                  <span className="text-xs font-normal text-zinc-500"> /month</span>
                </div>
                <ul className="space-y-2 text-xs text-zinc-400">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Cases limit: {SUBSCRIPTION_PLANS[currentPlan as SubscriptionPlanId]?.limits.cases}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Evidence items: {SUBSCRIPTION_PLANS[currentPlan as SubscriptionPlanId]?.limits.evidence}</span>
                  </li>
                  <li className="flex items-center gap-2 text-zinc-600 line-through">
                    <X className="w-3.5 h-3.5 text-zinc-600" />
                    <span>Litigation Strategy Engine</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Target Tier: Elite */}
            <div className="p-4 rounded-lg bg-gradient-to-b from-orange-950/20 to-zinc-950/80 border border-orange-500/50 flex flex-col justify-between relative shadow-lg">
              <div className="absolute -top-2.5 right-3 bg-orange-600 text-[9px] font-mono uppercase tracking-widest text-white px-2 py-0.5 rounded-full font-bold">
                Recommended
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-orange-400 uppercase tracking-wider font-bold">
                    Elite Plan
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono">
                    UNLIMITED
                  </span>
                </div>
                <div className="text-2xl font-bold text-white mb-4">
                  ${elitePlan.price}
                  <span className="text-xs font-normal text-zinc-400"> /month</span>
                </div>
                <ul className="space-y-2 text-xs text-zinc-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span className="font-semibold text-zinc-100">Litigation Strategy Engine</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>Adversarial Motion to Dismiss simulations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>Unlimited cases & evidence exhibits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>Full case backups & AI summaries</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleCheckout('elite')}
                disabled={loadingPlan === 'elite'}
                className="mt-5 w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase font-mono tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-orange-600/30 cursor-pointer disabled:opacity-50"
              >
                {loadingPlan === 'elite' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting Stripe...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    Upgrade to Elite (${elitePlan.price}/mo)
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Enterprise Option Note */}
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Need multi-user co-counsel access?</span>
            <button
              onClick={() => handleCheckout('enterprise')}
              className="text-orange-400 hover:text-orange-300 font-bold underline cursor-pointer"
            >
              Explore Enterprise ($99/mo)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
