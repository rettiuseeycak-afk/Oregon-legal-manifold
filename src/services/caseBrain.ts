import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { CaseBrain } from '../types/case';
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

const CASE_BRAIN_COLLECTION = 'caseBrain';

export async function rebuildCaseBrain(caseId: string): Promise<CaseBrain> {
  const evidenceQuery = query(collection(db, 'evidence'), where('caseId', '==', caseId));
  const evidenceSnap = await getDocs(evidenceQuery);

  const pleadingsQuery = query(collection(db, 'pleadings'), where('caseId', '==', caseId));
  const pleadingsSnap = await getDocs(pleadingsQuery);

  const postureRef = doc(db, 'casePosture', caseId);
  const postureSnap = await getDoc(postureRef);

  const evidence = evidenceSnap.docs.map((d) => d.data());
  const pleadings = pleadingsSnap.docs.map((d) => d.data());
  const posture = postureSnap.exists() ? postureSnap.data() : {};

  const genAI = getAiClient();

  const prompt = `
You are building a persistent "case brain" for an Oregon case.

Given:
- Evidence (titles, summaries, tags)
- Pleadings
- Procedural posture

Extract:
- parties[]
- claims[]
- defenses[]
- keyFacts[]
- proceduralPosture (short phrase)
- deadlines[] { label, dueDate?, ruleRef? }
- strategyNotes[]

Return JSON with those keys.

Evidence:
${JSON.stringify(evidence, null, 2)}

Pleadings:
${JSON.stringify(pleadings, null, 2)}

Procedural posture:
${JSON.stringify(posture, null, 2)}
`;

  const response = await generateContentWithFallback(genAI, {
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          parties: { type: Type.ARRAY, items: { type: Type.STRING } },
          claims: { type: Type.ARRAY, items: { type: Type.STRING } },
          defenses: { type: Type.ARRAY, items: { type: Type.STRING } },
          keyFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
          proceduralPosture: { type: Type.STRING },
          deadlines: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                dueDate: { type: Type.STRING },
                ruleRef: { type: Type.STRING }
              },
              required: ["label"]
            }
          },
          strategyNotes: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["parties", "claims", "defenses", "keyFacts", "proceduralPosture", "deadlines", "strategyNotes"]
      }
    }
  });

  const raw = response.text || "{}";
  const parsed = JSON.parse(raw);

  const brain: CaseBrain = {
    caseId,
    parties: parsed.parties ?? [],
    claims: parsed.claims ?? [],
    defenses: parsed.defenses ?? [],
    keyFacts: parsed.keyFacts ?? [],
    proceduralPosture: parsed.proceduralPosture ?? '',
    deadlines: parsed.deadlines ?? [],
    strategyNotes: parsed.strategyNotes ?? [],
    updatedAt: new Date().toISOString(),
  };

  const ref = doc(db, CASE_BRAIN_COLLECTION, caseId);
  await setDoc(ref, brain);

  return brain;
}
