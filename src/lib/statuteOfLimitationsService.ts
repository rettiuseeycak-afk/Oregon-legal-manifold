import { Case, Evidence, LegalClaim } from '../types';

export interface OregonStatuteRule {
  orsCitation: string;
  title: string;
  defaultYears: number;
  noticeDays?: number;
  description: string;
  categoryKeywords: string[];
}

export const OREGON_STATUTE_RULES: OregonStatuteRule[] = [
  {
    orsCitation: 'ORS 105.115 / ORS 12.110',
    title: 'Civil Trespass & Unlawful Entry',
    defaultYears: 2,
    description: 'Actions for unlawful entry, detainer, or intentional trespass onto land/real property.',
    categoryKeywords: ['trespass', 'unlawful entry', 'detainer', 'encroachment', 'boundary', 'fencing', 'land', 'property entry']
  },
  {
    orsCitation: 'ORS 12.080(1)',
    title: 'Breach of Written Contract & Covenant',
    defaultYears: 6,
    description: 'An action upon a contract or liability, express or implied, based on written agreement.',
    categoryKeywords: ['contract', 'written contract', 'covenant', 'agreement', 'lease', 'breach of contract', 'promissory note']
  },
  {
    orsCitation: 'ORS 72.7250',
    title: 'UCC Commercial Sale of Goods',
    defaultYears: 4,
    description: 'Breach of any contract for sale under the Uniform Commercial Code in Oregon.',
    categoryKeywords: ['sale of goods', 'ucc', 'vendor', 'commercial sale', 'goods delivery', 'merchant']
  },
  {
    orsCitation: 'ORS 12.110(1)',
    title: 'Personal Injury, Tort & Negligence',
    defaultYears: 2,
    description: 'An action for fraud, deceit, personal injury, or injury to rights not arising on contract.',
    categoryKeywords: ['negligence', 'personal injury', 'tort', 'fraud', 'misrepresentation', 'emotional distress', 'assault', 'battery']
  },
  {
    orsCitation: 'ORS 12.080(3)',
    title: 'Interference or Waste to Real Property',
    defaultYears: 6,
    description: 'Actions for waste or trespass upon real property, including physical injury to property.',
    categoryKeywords: ['property damage', 'waste', 'timber trespass', 'destruction', 'structure damage']
  },
  {
    orsCitation: 'ORS 12.120(2)',
    title: 'Defamation, Slander & Libel',
    defaultYears: 1,
    description: 'An action for libel or slander.',
    categoryKeywords: ['defamation', 'slander', 'libel', 'reputation', 'false statement']
  },
  {
    orsCitation: 'ORS 30.275',
    title: 'Oregon Tort Claims Act (Public Entity)',
    defaultYears: 2,
    noticeDays: 180,
    description: 'Action against a public body/officer. Requires formal notice within 180 days of injury.',
    categoryKeywords: ['public body', 'city', 'county', 'state', 'police', 'municipal', 'government', 'multnomah county', 'portland']
  },
  {
    orsCitation: 'ORS 652.140 / ORS 12.110',
    title: 'Wage & Hour / Employment Violation',
    defaultYears: 2,
    description: 'Actions for unpaid statutory wages, overtime, or statutory employment penalties.',
    categoryKeywords: ['wage', 'employment', 'overtime', 'termination', 'paycheck', 'labor']
  },
  {
    orsCitation: 'ORS 12.110(1)',
    title: 'General Residual Civil Claim',
    defaultYears: 2,
    description: 'General statutory limitation period for civil actions in Oregon courts.',
    categoryKeywords: ['general', 'civil claim', 'statutory breach', 'equitable claim']
  }
];

export interface ClaimLimitationResult {
  claimId: string;
  claimTitle: string;
  claimDescription: string;
  matchedRule: OregonStatuteRule;
  causeOfActionDate: string | null;
  dateSource: 'EXPLICIT_CLAIM_DATE' | 'LINKED_EVIDENCE' | 'CASE_TIMELINE' | 'MISSING';
  dateSourceTitle?: string;
  expirationDate: string | null;
  daysRemaining: number | null;
  riskLevel: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'SAFE' | 'MISSING_DATE';
  statutoryNoticeDays?: number;
  noticeDueDate?: string | null;
  noticeDaysRemaining?: number | null;
  recommendedAction: string;
}

export interface CaseLimitationsSummary {
  lastEvaluated: string;
  totalClaimsCount: number;
  expiredCount: number;
  criticalCount: number; // <= 60 days
  warningCount: number;  // <= 180 days
  safeCount: number;
  missingDateCount: number;
  overallRiskLevel: 'CRITICAL' | 'WARNING' | 'SAFE' | 'NEEDS_ATTENTION';
  results: ClaimLimitationResult[];
}

/**
 * Infer the best matching Oregon Revised Statute rule for a claim based on title, description, and linked evidence tags.
 */
export function matchOregonStatuteRule(claimTitle: string, claimDesc: string, evidenceTags: string[] = []): OregonStatuteRule {
  const combinedText = `${claimTitle} ${claimDesc} ${evidenceTags.join(' ')}`.toLowerCase();

  // Check for public entity / OTCA first if government/county/city mentioned
  if (combinedText.includes('county') || combinedText.includes('city') || combinedText.includes('state') || combinedText.includes('public body')) {
    if (combinedText.includes('tort') || combinedText.includes('trespass') || combinedText.includes('injury') || combinedText.includes('police')) {
      const otcaRule = OREGON_STATUTE_RULES.find(r => r.orsCitation === 'ORS 30.275');
      if (otcaRule) return otcaRule;
    }
  }

  let bestRule = OREGON_STATUTE_RULES[0]; // default to Trespass / ORS 105.115 if not matched
  let highestScore = -1;

  for (const rule of OREGON_STATUTE_RULES) {
    let score = 0;
    for (const kw of rule.categoryKeywords) {
      if (combinedText.includes(kw.toLowerCase())) {
        score += 2;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestRule = rule;
    }
  }

  return bestRule;
}

/**
 * Derives the cause of action / incident date for a claim from explicit field or linked evidence.
 */
export function resolveCauseOfActionDate(
  claim: LegalClaim,
  caseEvidence: Evidence[]
): { date: string | null; source: 'EXPLICIT_CLAIM_DATE' | 'LINKED_EVIDENCE' | 'CASE_TIMELINE' | 'MISSING'; sourceTitle?: string } {

  // 1. Explicit cause of action date on claim
  if (claim.causeOfActionDate && claim.causeOfActionDate.trim().length > 0) {
    return { date: claim.causeOfActionDate.trim(), source: 'EXPLICIT_CLAIM_DATE', sourceTitle: 'Set on Claim Record' };
  }

  // 2. Look up linked evidence items
  const linkedEvidence = caseEvidence.filter(e => claim.evidenceIds?.includes(e.id) && e.date);
  if (linkedEvidence.length > 0) {
    // Sort chronologically ascending to find the earliest event date (cause of action start)
    const sorted = [...linkedEvidence].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const earliest = sorted[0];
    return {
      date: earliest.date!,
      source: 'LINKED_EVIDENCE',
      sourceTitle: `${earliest.title} (${earliest.fileName || earliest.id})`
    };
  }

  // 3. Fallback: Check if any case evidence has a date
  const anyDatedEvidence = caseEvidence.filter(e => e.date).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  if (anyDatedEvidence.length > 0) {
    const earliestCase = anyDatedEvidence[0];
    return {
      date: earliestCase.date!,
      source: 'CASE_TIMELINE',
      sourceTitle: `Case Chronology: ${earliestCase.title}`
    };
  }

  return { date: null, source: 'MISSING' };
}

/**
 * Calculates limitation dates, countdown, and risk level for a single claim.
 */
export function calculateClaimLimitations(
  claim: LegalClaim,
  caseEvidence: Evidence[],
  referenceDate: Date = new Date()
): ClaimLimitationResult {
  const allEvidenceTags = caseEvidence
    .filter(e => claim.evidenceIds?.includes(e.id))
    .flatMap(e => e.tags || []);

  const matchedRule = matchOregonStatuteRule(claim.title, claim.description, allEvidenceTags);
  const dateInfo = resolveCauseOfActionDate(claim, caseEvidence);

  if (!dateInfo.date) {
    return {
      claimId: claim.id,
      claimTitle: claim.title,
      claimDescription: claim.description,
      matchedRule,
      causeOfActionDate: null,
      dateSource: 'MISSING',
      expirationDate: null,
      daysRemaining: null,
      riskLevel: 'MISSING_DATE',
      recommendedAction: `Link an evidence document or specify the incident date to initiate automated ORS limitation tracking.`
    };
  }

  const causeDate = new Date(dateInfo.date);
  if (isNaN(causeDate.getTime())) {
    return {
      claimId: claim.id,
      claimTitle: claim.title,
      claimDescription: claim.description,
      matchedRule,
      causeOfActionDate: dateInfo.date,
      dateSource: 'MISSING',
      expirationDate: null,
      daysRemaining: null,
      riskLevel: 'MISSING_DATE',
      recommendedAction: `Invalid date format (${dateInfo.date}). Update to YYYY-MM-DD to compute limitation window.`
    };
  }

  // Calculate Expiration Date: Cause of Action Date + Limitation Years
  const years = claim.limitationYears || matchedRule.defaultYears;
  const expDate = new Date(causeDate);
  expDate.setFullYear(expDate.getFullYear() + years);

  const formattedExpDate = expDate.toISOString().split('T')[0];

  // Days remaining calculation
  const diffTime = expDate.getTime() - referenceDate.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Handle OTCA Notice if applicable
  let noticeDueDate: string | null = null;
  let noticeDaysRemaining: number | null = null;
  if (matchedRule.noticeDays) {
    const noticeDate = new Date(causeDate);
    noticeDate.setDate(noticeDate.getDate() + matchedRule.noticeDays);
    noticeDueDate = noticeDate.toISOString().split('T')[0];
    const noticeDiff = noticeDate.getTime() - referenceDate.getTime();
    noticeDaysRemaining = Math.ceil(noticeDiff / (1000 * 60 * 60 * 24));
  }

  // Determine Risk Level
  let riskLevel: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'SAFE' = 'SAFE';
  if (daysRemaining <= 0) {
    riskLevel = 'EXPIRED';
  } else if (daysRemaining <= 60) {
    riskLevel = 'CRITICAL';
  } else if (daysRemaining <= 180) {
    riskLevel = 'WARNING';
  }

  let recommendedAction = '';
  if (riskLevel === 'EXPIRED') {
    recommendedAction = `CRITICAL: Statute of Limitations expired on ${formattedExpDate} under ${matchedRule.orsCitation}. Evaluate equitable tolling or discovery rule defenses immediately.`;
  } else if (riskLevel === 'CRITICAL') {
    recommendedAction = `URGENT: Only ${daysRemaining} days remaining before ${matchedRule.orsCitation} statutory bar (${formattedExpDate}). Prepare and file complaint or tolling agreement immediately!`;
  } else if (riskLevel === 'WARNING') {
    recommendedAction = `WARNING: Expiring within 6 months (${daysRemaining} days left). Ensure summons & complaint drafting is scheduled.`;
  } else {
    recommendedAction = `STABLE: ${daysRemaining} days remaining until statutory ceiling (${formattedExpDate}). Monitored under ${matchedRule.orsCitation}.`;
  }

  return {
    claimId: claim.id,
    claimTitle: claim.title,
    claimDescription: claim.description,
    matchedRule,
    causeOfActionDate: dateInfo.date,
    dateSource: dateInfo.source,
    dateSourceTitle: dateInfo.sourceTitle,
    expirationDate: formattedExpDate,
    daysRemaining,
    riskLevel,
    statutoryNoticeDays: matchedRule.noticeDays,
    noticeDueDate,
    noticeDaysRemaining,
    recommendedAction
  };
}

/**
 * Background Service: Runs calculation across all claims in a case manifold.
 */
export function evaluateAllCaseLimitations(activeCase: Case, referenceDate: Date = new Date()): CaseLimitationsSummary {
  const claims = activeCase.claims || [];
  const caseEvidence = activeCase.evidence || [];

  const results = claims.map(claim => calculateClaimLimitations(claim, caseEvidence, referenceDate));

  const expiredCount = results.filter(r => r.riskLevel === 'EXPIRED').length;
  const criticalCount = results.filter(r => r.riskLevel === 'CRITICAL').length;
  const warningCount = results.filter(r => r.riskLevel === 'WARNING').length;
  const safeCount = results.filter(r => r.riskLevel === 'SAFE').length;
  const missingDateCount = results.filter(r => r.riskLevel === 'MISSING_DATE').length;

  let overallRiskLevel: 'CRITICAL' | 'WARNING' | 'SAFE' | 'NEEDS_ATTENTION' = 'SAFE';
  if (expiredCount > 0 || criticalCount > 0) {
    overallRiskLevel = 'CRITICAL';
  } else if (warningCount > 0) {
    overallRiskLevel = 'WARNING';
  } else if (missingDateCount > 0) {
    overallRiskLevel = 'NEEDS_ATTENTION';
  }

  return {
    lastEvaluated: new Date().toLocaleTimeString(),
    totalClaimsCount: claims.length,
    expiredCount,
    criticalCount,
    warningCount,
    safeCount,
    missingDateCount,
    overallRiskLevel,
    results
  };
}
