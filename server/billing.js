import Stripe from "stripe";
import { SUBSCRIPTION_PLANS } from "../config/subscriptions.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createCheckoutSession(planId, userId) {
  const plan = SUBSCRIPTION_PLANS[planId];

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
    success_url: `${process.env.APP_URL}/billing/success?user=${userId}`,
    cancel_url: `${process.env.APP_URL}/billing/cancel`,
    metadata: { userId, planId }
  });

  return session.url;
}
