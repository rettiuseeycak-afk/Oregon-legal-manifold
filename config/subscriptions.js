export const SUBSCRIPTION_PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    limits: {
      cases: 1,
      evidence: 10,
      exports: false,
      ai_summaries: false,
      litigation_strategy: false,
      marketplace_access: false,
    }
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 19,
    limits: {
      cases: 20,
      evidence: 200,
      exports: true,
      ai_summaries: true,
      litigation_strategy: false,
      marketplace_access: true,
    }
  },
  elite: {
    id: "elite",
    name: "Elite",
    price: 49,
    limits: {
      cases: "unlimited",
      evidence: "unlimited",
      exports: true,
      ai_summaries: true,
      litigation_strategy: true,
      marketplace_access: true,
    }
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 99,
    limits: {
      cases: "unlimited",
      evidence: "unlimited",
      exports: true,
      ai_summaries: true,
      litigation_strategy: true,
      marketplace_access: true,
      multiuser: true,
    }
  }
};
