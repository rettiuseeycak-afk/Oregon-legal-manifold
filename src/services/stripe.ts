import Stripe from 'stripe';
import { SUBSCRIPTION_PLANS, SubscriptionPlanId } from '../types';

let stripeClient: Stripe | null = null;

/**
 * Lazy-initializes the Stripe SDK client.
 * Prevents application startup crashes when STRIPE_SECRET_KEY is not configured.
 */
export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

/**
 * Creates a Stripe Checkout Session for subscription checkout.
 *
 * @param planId The target subscription plan key ('free' | 'pro' | 'elite' | 'enterprise')
 * @param userId The authenticated user ID associated with the subscription
 * @returns The generated Stripe checkout session URL
 */
export async function createCheckoutSession(
  planId: string,
  userId: string
): Promise<string | null> {
  const stripe = getStripe();
  const planKey = planId as SubscriptionPlanId;
  const plan = SUBSCRIPTION_PLANS[planKey];

  if (!plan) {
    throw new Error(
      `Invalid planId "${planId}". Valid plans: ${Object.keys(SUBSCRIPTION_PLANS).join(', ')}`
    );
  }

  if (plan.price === 0) {
    throw new Error(
      `Plan "${plan.name}" is a free tier and does not require a Stripe checkout session.`
    );
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: plan.name },
          recurring: { interval: 'month' },
          unit_amount: plan.price * 100,
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/billing/success?user=${encodeURIComponent(userId)}`,
    cancel_url: `${appUrl}/billing/cancel`,
    metadata: { userId, planId },
  });

  return session.url;
}
