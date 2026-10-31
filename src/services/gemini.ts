import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
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

const AUDIT_COLLECTION = 'aiAudit';

export async function analyzeEvidenceText(params: {
  caseId: string;
  evidenceId: string;
  text: string;
}) {
  const genAI = getAiClient();

  const prompt = `
You are an Oregon litigation assistant.
Given this evidence text, extract:
- title
- date (ISO if possible)
- category (contract, correspondence, financial, court order, exhibit, pleading, transcript, other)
- 1–2 sentence factual/legal summary
- tags (array of short tokens)

Text:
${params.text.substring(0, 12000)}
`;

  const response = await generateContentWithFallback(genAI, {
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          date: { type: Type.STRING },
          category: { type: Type.STRING },
          summary: { type: Type.STRING },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "category", "summary", "tags"]
      }
    }
  });

  const raw = response.text || "{}";
  const parsed = JSON.parse(raw);

  // audit log
  const auditCollection = collection(db, AUDIT_COLLECTION);
  const auditRef = doc(auditCollection);
  await setDoc(auditRef, {
    id: auditRef.id,
    caseId: params.caseId,
    evidenceId: params.evidenceId,
    model: 'gemini-3.5-flash',
    prompt,
    rawResponse: raw,
    parsed,
    createdAt: new Date().toISOString(),
  });

  return parsed as {
    title: string;
    date?: string;
    category: string;
    summary: string;
    tags: string[];
  };
}
