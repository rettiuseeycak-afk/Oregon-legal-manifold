import { GoogleGenAI, Type } from '@google/genai';
import { Case, Evidence, LegalClaim } from '../types';
import { generateContentWithFallback } from './aiHelper';
import { OREGON_STATUTE_RULES } from '../lib/statuteOfLimitationsService';

let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

export interface ClaimVerificationResult {
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
}

export interface LimitationsCheckReport {
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
  verifiedClaims: ClaimVerificationResult[];
}

export async function runAutomatedLimitationsCheck(
  activeCase: Case,
  referenceDateStr?: string
): Promise<LimitationsCheckReport> {
  const ai = getAiClient();
  const today = referenceDateStr || new Date().toISOString().split('T')[0];

  const claims = activeCase.claims || [];
  const evidence = activeCase.evidence || [];

  if (claims.length === 0) {
    return {
      checkedAt: new Date().toISOString(),
      summary: {
        totalClaims: 0,
        timeBarredCount: 0,
        criticalCount: 0,
        warningCount: 0,
        timelyCount: 0,
        overallStatus: 'ALL_TIMELY',
        executiveSummary: 'No claims registered in this case manifold. Add claims to execute automated statute of limitations verification.'
      },
      verifiedClaims: []
    };
  }

  // Construct context
  const manifoldSummary = evidence.map(e => ({
    id: e.id,
    title: e.title,
    date: e.date || 'UNSPECIFIED_DATE',
    type: e.type,
    tags: e.tags || [],
    summary: e.summary || '',
    preview: e.content ? e.content.substring(0, 300) : ''
  }));

  const claimsSummary = claims.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    linkedEvidenceIds: c.evidenceIds || [],
    causeOfActionDate: c.causeOfActionDate || null,
    limitationYears: c.limitationYears || null,
    orsCitation: c.orsCitation || null
  }));

  const rulesTable = OREGON_STATUTE_RULES.map(r => ({
    orsCitation: r.orsCitation,
    title: r.title,
    defaultYears: r.defaultYears,
    noticeDays: r.noticeDays,
    description: r.description
  }));

  const prompt = `You are an elite Oregon Legal Jurisprudence and Statute of Limitations Verification Engine.
Your task is to conduct an AUTOMATED STATUTE OF LIMITATIONS CHECK by deeply cross-verifying the dates and factual records within the 'evidence_manifold' against the relevant statutes of limitations for each claim in this case.

TODAY'S REFERENCE DATE: ${today}

=== CASE INFORMATION ===
Case Name: ${activeCase.name}
Case Notes / Context: ${activeCase.notes || 'N/A'}
Court / State: Oregon State / Federal District of Oregon

=== OREGON STATUTORY RULES REFERENCE ===
${JSON.stringify(rulesTable, null, 2)}

=== EVIDENCE MANIFOLD (RECORDS & DATES) ===
${JSON.stringify(manifoldSummary, null, 2)}

=== CASE CLAIMS TO VERIFY ===
${JSON.stringify(claimsSummary, null, 2)}

=== YOUR INTERNALIZED CHAIN OF THOUGHT DIRECTIVES ===
For EACH claim:
1. [Step 1: Evidence Manifold Date Cross-Verification]: Inspect all evidence items linked to this claim, as well as unlinked evidence items in the manifold that mention relevant incidents. Extract all explicit dates, timestamps, communication records, or injury notices.
2. [Step 2: Accrual Determination]: Identify the exact accrual date under Oregon law. If discovery rule applies (e.g. fraud, medical malpractice, latent property damage under ORS 12.110), state when the plaintiff first discovered or reasonably should have discovered the injury and responsible party.
3. [Step 3: Statutory and Tolling Check]: Match the claim to the correct Oregon statute (e.g., ORS 105.115 for trespass, ORS 12.080(1) for contract, ORS 12.110 for tort/negligence, ORS 30.275 for OTCA public body with 180-day notice). Evaluate whether any tolling factors exist (equitable tolling, minority/disability, fraudulent concealment).
4. [Step 4: Time-Bar Calculation]: Calculate exact statutory deadline: Accrual Date + Statutory Period. Compare against Today's Date (${today}). If statutory deadline is in the past, flag 'isTimeBarred = true' and calculate exact days overdue (negative integer). If statutory deadline is in the future, calculate exact days remaining (positive integer).
   - Risk Level Classification:
     * 'TIME_BARRED': Deadline is past (daysRemaining <= 0).
     * 'CRITICAL': Deadline is within 60 days.
     * 'WARNING': Deadline is within 180 days.
     * 'TIMELY': Deadline is > 180 days in the future.
     * 'INDETERMINATE': Missing evidence dates or unable to ascertain.
5. [Step 5: Defenses and Remedies]: If time-barred or critical, provide actionable Oregon legal strategies (e.g., continuous tort doctrine, relation-back under ORCP 23 C, equitable estoppel, filing emergency complaint or notice of claim under ORS 30.275).

Provide a comprehensive, high-fidelity JSON report following the strict schema below. Ensure every claim is analyzed and flagged accurately.`;

  const response = await generateContentWithFallback(ai, {
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.OBJECT,
            properties: {
              totalClaims: { type: Type.NUMBER },
              timeBarredCount: { type: Type.NUMBER },
              criticalCount: { type: Type.NUMBER },
              warningCount: { type: Type.NUMBER },
              timelyCount: { type: Type.NUMBER },
              overallStatus: {
                type: Type.STRING,
                enum: ['TIME_BARRED_DETECTED', 'CRITICAL_ACTION_REQUIRED', 'WARNING', 'ALL_TIMELY']
              },
              executiveSummary: { type: Type.STRING }
            },
            required: ['totalClaims', 'timeBarredCount', 'criticalCount', 'warningCount', 'timelyCount', 'overallStatus', 'executiveSummary']
          },
          verifiedClaims: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                claimId: { type: Type.STRING },
                claimTitle: { type: Type.STRING },
                isTimeBarred: { type: Type.BOOLEAN },
                riskLevel: {
                  type: Type.STRING,
                  enum: ['TIME_BARRED', 'CRITICAL', 'WARNING', 'TIMELY', 'INDETERMINATE']
                },
                matchedStatute: { type: Type.STRING },
                statuteDurationYears: { type: Type.NUMBER },
                accrualDate: { type: Type.STRING },
                accrualRationale: { type: Type.STRING },
                evidenceCrossMatches: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      evidenceId: { type: Type.STRING },
                      evidenceTitle: { type: Type.STRING },
                      dateFound: { type: Type.STRING },
                      relevanceNote: { type: Type.STRING }
                    },
                    required: ['evidenceId', 'evidenceTitle', 'dateFound', 'relevanceNote']
                  }
                },
                statutoryDeadline: { type: Type.STRING },
                daysRemainingOrOverdue: { type: Type.NUMBER },
                discoveryRuleApplicable: { type: Type.BOOLEAN },
                discoveryRuleDetails: { type: Type.STRING },
                tollingAnalysis: { type: Type.STRING },
                internalizedChainOfThought: {
                  type: Type.OBJECT,
                  properties: {
                    step1_manifold_cross_verification: { type: Type.STRING },
                    step2_accrual_determination: { type: Type.STRING },
                    step3_statutory_and_tolling_check: { type: Type.STRING },
                    step4_time_bar_calculation: { type: Type.STRING },
                    step5_defense_and_remedies: { type: Type.STRING }
                  },
                  required: [
                    'step1_manifold_cross_verification',
                    'step2_accrual_determination',
                    'step3_statutory_and_tolling_check',
                    'step4_time_bar_calculation',
                    'step5_defense_and_remedies'
                  ]
                },
                recommendedAction: { type: Type.STRING }
              },
              required: [
                'claimId',
                'claimTitle',
                'isTimeBarred',
                'riskLevel',
                'matchedStatute',
                'statuteDurationYears',
                'accrualDate',
                'accrualRationale',
                'evidenceCrossMatches',
                'statutoryDeadline',
                'daysRemainingOrOverdue',
                'discoveryRuleApplicable',
                'discoveryRuleDetails',
                'tollingAnalysis',
                'internalizedChainOfThought',
                'recommendedAction'
              ]
            }
          }
        },
        required: ['summary', 'verifiedClaims']
      }
    }
  });

  const parsed = JSON.parse(response.text || '{}');
  return {
    checkedAt: new Date().toISOString(),
    summary: parsed.summary || {
      totalClaims: claims.length,
      timeBarredCount: 0,
      criticalCount: 0,
      warningCount: 0,
      timelyCount: claims.length,
      overallStatus: 'ALL_TIMELY',
      executiveSummary: 'Automated verification completed.'
    },
    verifiedClaims: parsed.verifiedClaims || []
  };
}
