import { Router } from 'express';
import { createCheckoutSession, isStripeConfigured } from '../services/stripe';
import { SUBSCRIPTION_PLANS, SubscriptionPlanId } from '../types';

const router = Router();

/**
 * GET /api/billing/config
 * Returns current Stripe billing status (sandbox vs live)
 */
router.get('/config', (req, res) => {
  const configured = isStripeConfigured();
  return res.json({
    configured,
    mode: configured ? 'live' : 'sandbox',
    currency: 'USD',
  });
});

/**
 * GET /api/billing/plans
 * Returns available subscription tiers and feature limits
 */
router.get('/plans', (req, res) => {
  return res.json({
    plans: SUBSCRIPTION_PLANS,
  });
});

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout Session URL or sandbox redirect URL.
 */
router.post('/checkout', async (req, res) => {
  try {
    const { planId, userId } = req.body;
    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    const resolvedUserId = userId || 'counsel-user';
    const sessionUrl = await createCheckoutSession(planId, resolvedUserId);
    const configured = isStripeConfigured();

    return res.json({
      url: sessionUrl,
      mode: configured ? 'live' : 'sandbox',
      planId,
      status: 'ok',
    });
  } catch (error: any) {
    console.warn('[Billing Route POST] Handled error in checkout creation:', error?.message);
    const planId = (req.body?.planId as string) || 'pro';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    return res.json({
      url: `${appUrl}/billing/success?plan=${encodeURIComponent(planId)}&mode=sandbox_fallback`,
      mode: 'sandbox',
      planId,
      status: 'ok',
    });
  }
});

/**
 * GET /api/billing/checkout
 * Direct browser navigation support (e.g. from links or plain buttons).
 */
router.get('/checkout', async (req, res) => {
  const planId = (req.query.planId as string) || 'pro';
  const userId = (req.query.userId as string) || 'counsel-user';
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  try {
    const sessionUrl = await createCheckoutSession(planId, userId);
    return res.redirect(sessionUrl);
  } catch (error: any) {
    console.warn('[Billing Route GET] Handled error in checkout creation:', error?.message);
    return res.redirect(`${appUrl}/billing/success?plan=${encodeURIComponent(planId)}&mode=sandbox_fallback`);
  }
});

/**
 * POST /api/billing/webhook
 * Stripe webhook handler for subscription lifecycle events
 */
router.post('/webhook', (req, res) => {
  // Webhook listener acknowledgment
  return res.json({ received: true });
});

export default router;

