import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { generateContentWithFallback } from './aiHelper';

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
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

const ISSUE_COLLECTION = 'caseIssues';

export interface CaseIssueProfile {
  caseId: string;
  issues: {
    label: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    supportingEvidenceIds: string[];
    suggestedClaims: string[];
    suggestedDefenses: string[];
    suggestedDiscovery: string[];
    suggestedMotions: string[];
  }[];
  updatedAt: string;
}

export async function buildIssueProfile(caseId: string) {
  const evidenceQuery = query(collection(db, 'evidence'), where('caseId', '==', caseId));
  const evidenceSnap = await getDocs(evidenceQuery);
  const evidence = evidenceSnap.docs.map((d) => d.data());

  const genAI = getAiClient();

  const prompt = `
You are an Oregon civil litigator.
Given this evidence (titles, summaries, tags), perform issue spotting.

Return JSON:
{
  "issues": [
    {
      "label": string,
      "riskLevel": "LOW" | "MEDIUM" | "HIGH",
      "supportingEvidenceIds": [string],
      "suggestedClaims": [string],
      "suggestedDefenses": [string],
      "suggestedDiscovery": [string],
      "suggestedMotions": [string]
    }
  ]
}

Evidence:
${JSON.stringify(evidence, null, 2)}
`;

  const response = await generateContentWithFallback(genAI, {
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          issues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                riskLevel: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
                supportingEvidenceIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestedClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestedDefenses: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestedDiscovery: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestedMotions: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["label", "riskLevel", "supportingEvidenceIds", "suggestedClaims", "suggestedDefenses", "suggestedDiscovery", "suggestedMotions"]
            }
          }
        },
        required: ["issues"]
      }
    }
  });

  const raw = response.text || "{}";
  const parsed = JSON.parse(raw);

  const profile: CaseIssueProfile = {
    caseId,
    issues: parsed.issues ?? [],
    updatedAt: new Date().toISOString(),
  };

  const ref = doc(db, ISSUE_COLLECTION, caseId);
  await setDoc(ref, profile);

  return profile;
}
