import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, query, where, setDoc } from 'firebase/firestore';
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

const CASES_COLLECTION = 'cases';
const POSTURE_COLLECTION = 'casePosture';

export interface ProceduralPosture {
  caseId: string;
  posture: string;
  nextSteps: { label: string; ruleRef?: string }[];
  deadlines: { label: string; dueDate: string; ruleRef?: string }[];
  reasoning: string;
  updatedAt: string;
}

export async function updateProceduralPosture(caseId: string) {
  const caseRef = doc(db, CASES_COLLECTION, caseId);
  const caseSnap = await getDoc(caseRef);
  const caseData = caseSnap.exists() ? caseSnap.data() : {};

  const pleadingsQuery = query(collection(db, 'pleadings'), where('caseId', '==', caseId));
  const pleadingsSnap = await getDocs(pleadingsQuery);
  const pleadings = pleadingsSnap.docs.map((d) => d.data());

  const genAI = getAiClient();

  const prompt = `
You are an Oregon civil procedure expert.
Given this case metadata and list of filed pleadings, determine:
- current procedural posture (short phrase)
- next required filings (with ORCP/ORS references where applicable)
- upcoming deadlines (with rule references and relative dates if exact date unknown)
Return JSON with keys: posture, nextSteps[], deadlines[], reasoning.

Case:
${JSON.stringify(caseData, null, 2)}

Pleadings:
${JSON.stringify(pleadings, null, 2)}
`;

  const response = await generateContentWithFallback(genAI, {
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          posture: { type: Type.STRING },
          nextSteps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                ruleRef: { type: Type.STRING }
              },
              required: ["label"]
            }
          },
          deadlines: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                dueDate: { type: Type.STRING },
                ruleRef: { type: Type.STRING }
              },
              required: ["label", "dueDate"]
            }
          },
          reasoning: { type: Type.STRING }
        },
        required: ["posture", "nextSteps", "deadlines", "reasoning"]
      }
    }
  });

  const raw = response.text || '{}';
  const parsed = JSON.parse(raw);

  const posture: ProceduralPosture = {
    caseId,
    posture: parsed.posture,
    nextSteps: parsed.nextSteps ?? [],
    deadlines: parsed.deadlines ?? [],
    reasoning: parsed.reasoning ?? '',
    updatedAt: new Date().toISOString(),
  };

  const postureRef = doc(db, POSTURE_COLLECTION, caseId);
  await setDoc(postureRef, posture);

  return posture;
}
