import { Router } from 'express';
import { createCheckoutSession } from '../services/stripe';

const router = Router();

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout Session URL for client subscription redirection.
 */
router.post('/checkout', async (req, res) => {
  try {
    const { planId, userId } = req.body;
    if (!planId || !userId) {
      return res.status(400).json({ error: 'planId and userId are required parameters' });
    }

    const sessionUrl = await createCheckoutSession(planId, userId);
    return res.json({ url: sessionUrl });
  } catch (error: any) {
    console.error('Failed to create checkout session:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to create Stripe checkout session'
    });
  }
});

export default router;
