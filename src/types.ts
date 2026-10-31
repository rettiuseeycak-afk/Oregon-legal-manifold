export interface CaseLoadFinding {
  id: string;
  caseId?: string;
  documentId?: string;
  findingType?: string;
  type?: 'unauthorized_info' | 'discrepancy' | 'violation';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'High' | 'Medium' | 'Low' | string;
  description: string;
  status?: 'Unresolved' | 'Flagged' | 'Resolved' | string;
  violationType?: string;
  suggestedAction?: string;
  location?: string;
}

export interface Evidence {
  id: string;
  title: string;
  type: 'exhibit' | 'transcript' | 'correspondence' | 'pleading' | 'other';
  content: string;
  date?: string;
  summary?: string;
  fileSize?: string;
  fileName?: string;
  tags?: string[];
  findings?: CaseLoadFinding[];
}

export interface LegalClaim {
  id: string;
  title: string;
  description: string;
  evidenceIds: string[];
  causeOfActionDate?: string;
  limitationYears?: number;
  orsCitation?: string;
  validatedPrecedents?: {
    title: string;
    snippet: string;
    url: string;
    sourceType: 'STATUTE' | 'CASE_LAW' | 'RULE' | 'OTHER';
    relevance: number;
    validatedAt?: string;
  }[];
}

export interface Case {
  id: string;
  name: string;
  jurisdiction: string;
  courtRules: string;
  evidence: Evidence[];
  claims: LegalClaim[];
  notes?: string;
  generatedDocs: {
    complaint?: string;
    motion?: string;
    toa?: string;
    toc?: string;
    corporateDisclosureStatement?: string;
    notice?: string;
    checklist?: string;
    [key: string]: string | undefined;
  };
  rectificationScan?: {
    input: string;
    results: string;
  };
  isFinalized?: boolean;
  executiveSummary?: string;
  executiveSummaryGeneratedAt?: string;
  updatedAt?: string;
  timelineAnalysis?: string;
  judicialReview?: {
    input: string;
    report: string;
  };
  citationAudit?: {
    input: string;
    results: string;
  };
  checklistItems?: Record<string, boolean>;
  adversarialSimulation?: {
    input: string;
    report: string;
  };
  evidenceAudit?: {
    input: string;
    report: string;
  };
  corporateDisclosure?: {
    parties: { name: string; ticker?: string; parent?: string; isPrivate: boolean }[];
  };
  interrogatories?: {
    theory: string;
    results: {
      question: string;
      anchor: string;
      reasoning: string;
    }[];
  };
  systemicAudit?: {
    score: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    findings: {
      category: string;
      status: 'PASS' | 'FAIL' | 'WARNING';
      detail: string;
    }[];
    recommendations: string[];
  };
  serviceOfProcess?: {
    complaintFiled: boolean;
    servedOtherParty: boolean;
    proofOfServiceFiled: boolean;
    serverType?: 'Professional' | 'Sheriff' | 'Other';
    serviceDate?: string;
  };
  oregonLegalHierarchy?: {
    orsChecked: boolean;
    utcrChecked: boolean;
    slrChecked: boolean;
    municipalCodeChecked: boolean;
  };
  smallClaimsData?: {
    claimAmount: number;
    demandLetterSent: boolean;
    demandLetterDate?: string;
    isBusinessDefendant: boolean;
    registeredAgentFound?: boolean;
    feeWaiverRequested: boolean;
    jurisdictionBasis: 'Defendant Residence' | 'Event Location' | 'Other';
    responseReceived: boolean;
    responseType?: 'None' | 'Admit' | 'Deny';
    mediationScheduled: boolean;
    filingDate?: string;
  };
  discoveryPlanItems?: DiscoveryItem[];
  researchFindings?: {
    title: string;
    snippet: string;
    url: string;
    sourceType: 'STATUTE' | 'CASE_LAW' | 'RULE' | 'OTHER';
    jurisdiction?: string;
    relevance: number;
    savedAt?: string;
    associatedClaimId?: string;
  }[];
  limitationsAuditReport?: {
    checkedAt: string;
    summary: {
      totalClaims: number;
      timeBarredCount: number;
      criticalCount: number;
      warningCount: number;
      timelyCount: number;
      overallStatus: 'TIME_BARRED_DETECTED' | 'CRITICAL_ACTION_REQUIRED' | 'WARNING' | 'ALL_TIMELY';
      executiveSummary: string;
    };
    verifiedClaims: Array<{
      claimId: string;
      claimTitle: string;
      isTimeBarred: boolean;
      riskLevel: 'TIME_BARRED' | 'CRITICAL' | 'WARNING' | 'TIMELY' | 'INDETERMINATE';
      matchedStatute: string;
      statuteDurationYears: number;
      accrualDate: string;
      accrualRationale: string;
      evidenceCrossMatches: Array<{
        evidenceId: string;
        evidenceTitle: string;
        dateFound: string;
        relevanceNote: string;
      }>;
      statutoryDeadline: string;
      daysRemainingOrOverdue: number;
      discoveryRuleApplicable: boolean;
      discoveryRuleDetails: string;
      tollingAnalysis: string;
      internalizedChainOfThought: {
        step1_manifold_cross_verification: string;
        step2_accrual_determination: string;
        step3_statutory_and_tolling_check: string;
        step4_time_bar_calculation: string;
        step5_defense_and_remedies: string;
      };
      recommendedAction: string;
    }>;
  };
}

export interface DiscoveryItem {
  id: string;
  toolType: 'interrogatory' | 'rfp' | 'rfa' | 'deposition' | 'other';
  targetParty: string;
  informationSought: string;
  legalBasis: string;
  purposeAndImpact: string;
  status: 'Draft' | 'Issued' | 'Completed' | 'Objected';
  supportedClaimId?: string;
}

export interface OregonLegalRule {
  rule_id: string;
  source_layer: string;
  citation: string;
  title: string;
  category: string;
  rule_type: string;
  deadline?: {
    period: string;
    period_days: number;
    trigger_event: string;
    absolute_cap: string | null;
  };
  notes?: string;
}

export interface OregonLegalManifold {
  metadata: {
    name: string;
    version: string;
    jurisdiction: string;
    sources: string[];
  };
  rules: OregonLegalRule[];
}

export interface Precedent {
  id: string;
  title: string;
  citation: string;
  jurisdiction: string;
  caseType: string;
  decisionDate: string;
  summary: string;
  holdings: string[];
  keywords: string[];
  addedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SubscriptionPlanId = 'free' | 'pro' | 'elite' | 'enterprise';

export interface PlanLimits {
  cases: number | 'unlimited';
  evidence: number | 'unlimited';
  exports: boolean | number;
  ai_summaries: boolean;
  litigation_strategy?: boolean;
  marketplace_access?: boolean;
  multiuser?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  limits: PlanLimits;
}

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

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  plan: string;
  usage?: Record<string, number>;
  createdAt: number;
}

/**
 * Checks if a user is within their subscription plan limits for a specific metric.
 *
 * @param user User object containing plan and usage dictionary
 * @param metric The metric to check against the plan limits (e.g., 'cases', 'evidence', 'exports', 'ai_summaries')
 * @param amount The amount of the metric being requested (defaults to 1)
 * @returns True if allowed, false if limit exceeded or disallowed
 */
export function checkUsageLimit(
  user: { plan: string; usage?: Record<string, number> },
  metric: string,
  amount: number = 1
): boolean {
  const plan = (SUBSCRIPTION_PLANS as Record<string, SubscriptionPlan>)[user.plan] || SUBSCRIPTION_PLANS.free;
  const limit = (plan.limits as Record<string, any>)[metric];

  if (limit === "unlimited") return true;
  if (limit === false) return false;
  if (limit === true) return true;

  const current = (user.usage && user.usage[metric]) || 0;
  return current + amount <= limit;
}

/**
 * Checks whether a user's subscription tier meets or exceeds a required plan level.
 *
 * @param user User object containing their current plan
 * @param requiredPlan The minimum required plan level ('free', 'pro', 'elite', 'enterprise')
 * @returns True if the user's plan meets or exceeds the required level
 */
export function requirePlan(
  user: { plan: string },
  requiredPlan: SubscriptionPlanId | string
): boolean {
  const levels = ["free", "pro", "elite", "enterprise"];
  return levels.indexOf(user.plan) >= levels.indexOf(requiredPlan);
}

