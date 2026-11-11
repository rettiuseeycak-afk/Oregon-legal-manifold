import Stripe from "stripe";
import { SUBSCRIPTION_PLANS } from "../config/subscriptions.js";

const key = process.env.STRIPE_SECRET_KEY?.trim();
const isKeyValid = key && /^(sk_test_|sk_live_|rk_test_|rk_live_)[a-zA-Z0-9_]{10,}$/.test(key);
const stripe = isKeyValid ? new Stripe(key) : null;

export async function createCheckoutSession(planId, userId) {
  const plan = SUBSCRIPTION_PLANS[planId];
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  if (!plan) {
    throw new Error(`Invalid plan: ${planId}`);
  }

  if (stripe && plan.price > 0) {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: plan.name },
            recurring: { interval: "month" },
            unit_amount: plan.price * 100,
          },
          quantity: 1,
        }],
        success_url: `${appUrl}/billing/success?user=${userId}&plan=${planId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/billing/cancel`,
        metadata: { userId, planId }
      });

      if (session.url) {
        return session.url;
      }
    } catch (err) {
      console.warn("[Stripe server/billing] Stripe call failed, using sandbox fallback:", err.message);
    }
  }

  return `${appUrl}/billing/success?user=${encodeURIComponent(userId)}&plan=${encodeURIComponent(planId)}&session_id=sandbox_cs_${Date.now()}&mode=sandbox`;
}

