# Implementation Plan: JurisAI Billing & Subscription Engine

## User Review & Critical Decisions Summary
- **Clarification Outcome (User Confirmed 1, 2, 3)**:
  1. **Full Billing Portal**: Detailed plan overview, payment method management, invoice receipt history (with printable/downloadable PDF/HTML receipts), and subscription status (Active, Cancelled, Renewal Date).
  2. **Direct In-App Plan Switcher**: One-click upgrade/downgrade modals with comparison tables and immediate prorated limit adjustments.
  3. **Usage-Based Credit Refill Pack**: In addition to monthly plan allowances, users can refill on-demand AI legal research credits and evidence capacity packs.
- **Payment Processing Strategy**:
  - Full-stack Stripe integration pattern (`/api/billing/create-checkout-session` and `/api/billing/webhook` / `/api/billing/portal`).
  - Seamless in-app mock/simulated checkout modal when running without a live `STRIPE_SECRET_KEY` so testing is 100% functional immediately in all environments.
- **Plan Limits & Feature Gating**:
  - **Free**: 1 case, 10 evidence items, no exports, no AI summaries, no litigation strategy engine, no marketplace.
  - **Pro ($19/mo)**: 20 cases, 200 evidence items, export enabled, AI summaries enabled, marketplace access.
  - **Elite ($49/mo)**: Unlimited cases & evidence, litigation strategy engine, AI summaries, exports, marketplace access.
  - **Enterprise ($99/mo)**: Unlimited cases, evidence, litigation strategy engine, marketplace, multi-user collaboration & priority compute.

---

## 1. Overview & Core Concept
JurisAI is a specialized legal research and litigation preparation platform. To monetize the application and enforce computational boundaries, we will establish a billing engine that connects authentication, tier limits, persistent billing state in Firestore, checkout sessions, and self-service dashboard management.

The engine gives attorneys and pro-se litigants transparent access to tier limits, soft upgrade prompts (e.g., when attempting to launch the Elite Litigation Strategy Engine or upload past evidence caps), and an interactive invoice receipt archive.

---

## 2. User Experience & Visual Design
- **Top Bar Billing Pill & Upgrade Action**:
  - Displays current plan badge (`Free`, `Pro`, `Elite`, or `Enterprise`) with an "Upgrade" button and remaining AI credits counter.
- **Interactive Billing Modal & Plan Matrix**:
  - Responsive comparison grid highlighting feature differences:
    - Cases allowance (1 vs 20 vs Unlimited)
    - Evidence vault volume (10 docs vs 200 vs Unlimited)
    - Formal Complaint & Pleading Document Exports (DOCX/PDF)
    - AI Legal Summarizer & Case Law Precedent matcher
    - Elite Litigation Strategy & Claim Generation Engine
    - Multi-seat firm access
  - Monthly vs Annual toggle (with 15% annual discount indicator).
  - "Current Plan", "Upgrade", and "Downgrade" dynamic CTAs.
- **Self-Service Billing Portal View (`BillingDashboard`)**:
  - Current Plan Status card: renewal date, billing cycle, active payment card preview (e.g., `•••• 4242`).
  - Live Usage Meter: Visual radial / progress bars tracking Case Count, Evidence Uploads, and AI Strategy queries against plan maximums.
  - Credit Refill Station: Quick buy $10 / $25 / $50 token refill packages for deep legal research queries.
  - Billing History & Invoices: Tabular ledger with date, invoice number (e.g. `INV-2026-0812`), amount, status (`Paid`), and an interactive "View / Print Receipt" modal.
- **Feature Gate Modal ("Upgrade Required")**:
  - Clean modal triggered whenever a user hits plan limits (e.g., `requirePlan(user, "elite")` on the Litigation Strategy Engine or `cases >= 1` on Free tier).
  - Clear rationale, list of unlocked capabilities, and instant checkout launch.

---

## 3. Key Product Decisions & Trade-Offs
1. **Hybrid Payment Pipeline (Stripe + Simulated Sandbox)**:
   - *Decision*: Provide real server-side Stripe checkout endpoints if `STRIPE_SECRET_KEY` is set in the environment, while providing a sandbox fallback modal with instant activation and simulated test card processing.
   - *Rationale*: Allows instantaneous testing and full UI demonstration in sandbox environments without blocking deployment or requiring the user to immediately paste live payment secrets.
2. **Graceful Downgrade Handling**:
   - *Decision*: Existing cases and evidence are preserved as read-only if a user downgrades from Pro/Elite to Free; new creation is locked until usage falls below the new tier's threshold.
   - *Rationale*: Prevents catastrophic loss of client legal files while adhering strictly to tier limits.
3. **Optimistic UI with Firestore Persistence**:
   - *Decision*: Update user subscription status and add invoice ledger items directly in Firestore under the authenticated user document so state persists across sessions and reloads.

---

## 4. Technical Architecture & Data Strategy

```
+-------------------------------------------------------------------------+
|                              JurisAI App                                |
+------------------------------------+------------------------------------+
                                     |
                +--------------------+--------------------+
                |                                         |
                v                                         v
   +--------------------------+              +--------------------------+
   |   Plan Enforcer Guard    |              |     Billing Dashboard    |
   | - requirePlan(user, tier)|              | - Plan comparison cards  |
   | - checkLimits(user, type)|              | - Usage progression bars |
   | - triggerUpgradeModal()  |              | - Credit refill pack     |
   +------------+-------------+              | - Invoice ledger modal   |
                |                            +------------+-------------+
                v                                         |
   +------------------------------------------------------+-------------+
   |                       Billing Client Service                       |
   |   - startCheckout(planId)                                          |
   |   - refillCredits(amount)                                          |
   |   - cancelSubscription() / changePlan(newPlanId)                   |
   +------------------------------------+-------------------------------+
                                        |
                 +----------------------+----------------------+
                 | (If STRIPE_SECRET_KEY)                      | (Fallback / Sandbox)
                 v                                             v
   +----------------------------+                +----------------------------+
   |  Express Backend API       |                |  In-App Checkout Modal     |
   |  /api/billing/checkout     |                |  - Instant test card swipe |
   |  /api/billing/webhook      |                |  - Local receipt generator |
   +-------------+--------------+                +-------------+--------------+
                 |                                             |
                 +----------------------+----------------------+
                                        |
                                        v
                         +------------------------------+
                         |      Firestore Database      |
                         |  users/{userId}              |
                         |   - plan: "free"|"pro"|"elite"|
                         |   - usage: { cases, docs }   |
                         |   - credits: number          |
                         |   - invoices: [ ... ]        |
                         +------------------------------+
```

### File Changes Planned:
1. `src/config/subscriptions.ts`:
   - Full definition of `SUBSCRIPTION_PLANS` with Free ($0), Pro ($19), Elite ($49), and Enterprise ($99), limits, and feature flags.
2. `src/services/billingService.ts`:
   - Helpers for plan checking (`requirePlan`, `canCreateCase`, `canAddEvidence`), checkout dispatch, credit top-up, and mock invoice generation.
3. `src/components/BillingDashboard.tsx`:
   - Full billing overview, usage progress bars, plan cards, credit refill triggers, and invoice history table.
4. `src/components/BillingModal.tsx`:
   - Modal for selecting and upgrading/downgrading plans with feature breakdown.
5. `src/components/UpgradePromptModal.tsx`:
   - Reusable trigger modal when gating features (e.g. Litigation Strategy Engine).
6. `src/components/InvoiceReceiptModal.tsx`:
   - Printable receipt viewer with legal firm invoice styling.
7. `firebase-blueprint.json` & `firestore.rules`:
   - Documenting the updated schema properties on `User` (`plan`, `usage`, `credits`, `invoices`, `stripeCustomerId`).
8. `server.ts` / server routes (optional server enhancement):
   - Stripe session creator endpoint with graceful mock fallback.
