import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { generateContentWithFallback } from "./src/services/aiHelper";
import { executeAutoLegalResearch } from "./src/services/legalResearchTool";
import { runAutomatedLimitationsCheck } from "./src/services/statuteLimitationsChecker";

import evidenceRouter from './src/routes/evidence';
import evidenceAnalyzeRouter from './src/routes/evidenceAnalyze';

dotenv.config();

// Lazy initialize Gemini client safely
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  
  // Custom Routers
  app.use("/api/evidence", evidenceRouter);
  app.use("/api/evidence", evidenceAnalyzeRouter);
  app.use("/api/posture", (await import('./src/routes/posture')).default);
  app.use("/api/timeline", (await import('./src/routes/timeline')).default);
  app.use("/api/issues", (await import('./src/routes/issues')).default);
  app.use("/api/brain", (await import('./src/routes/brain')).default);
  app.use("/api/pdf", (await import('./src/routes/pdf')).default);
  app.use("/api/workspace", (await import('./src/routes/workspace')).default);
  app.use("/api/billing", (await import('./src/routes/billing')).default);
  app.use("/api/auth", (await import('./src/routes/auth')).default);

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", system: "Legal Manifold v2.5", timestamp: new Date().toISOString() });
  });

  // AI Legal Research Endpoint
  app.post("/api/research", async (req, res) => {
    const { query: searchQuery, precedentsContext } = req.body;
    if (!searchQuery) {
      return res.status(400).json({ error: "Query is required" });
    }

    try {
      const ai = getAiClient();
      
      const prompt = `Perform high-fidelity legal research for: "${searchQuery}".
        We have a database of synced precedents:
        ${JSON.stringify(precedentsContext || [])}
        
        Focus on relevant Oregon Revised Statutes (ORS), Oregon Rules of Civil Procedure (ORCP), and notable high-court precedents.
        Explain how any matched precedents or other case law applies to this situation.
        Provide a list of structured findings.`;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              findings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    snippet: { type: Type.STRING },
                    url: { type: Type.STRING },
                    sourceType: { type: Type.STRING, enum: ['STATUTE', 'CASE_LAW', 'RULE', 'OTHER'] },
                    jurisdiction: { type: Type.STRING },
                    relevance: { type: Type.NUMBER }
                  },
                  required: ["title", "snippet", "url", "sourceType"]
                }
              }
            },
            required: ["findings"]
          }
        },
      });

      const parsed = JSON.parse(response.text || '{"findings": []}');
      res.json(parsed);
    } catch (err: any) {
      console.error("[SERVER] Research error:", err);
      res.status(500).json({
        error: "AI Research failed.",
        details: err.message || "Unknown error occurred"
      });
    }
  });

  // Automated Legal Research based on claims/evidence
  app.post("/api/research/auto", async (req, res) => {
    const { activeCase, apiSettings } = req.body;
    if (!activeCase) {
      return res.status(400).json({ error: "activeCase is required" });
    }

    try {
      const findings = await executeAutoLegalResearch(activeCase, apiSettings);
      res.json({ findings });
    } catch (err: any) {
      console.error("[SERVER] Automated Legal Research error:", err);
      res.status(500).json({
        error: "Automated AI Legal Research failed.",
        details: err.message || "Unknown error occurred"
      });
    }
  });

  // Automated Statute of Limitations Checker with Internalized Chain of Thought
  app.post("/api/limitations/checker", async (req, res) => {
    const { activeCase, referenceDate } = req.body;
    if (!activeCase) {
      return res.status(400).json({ error: "activeCase is required for statute of limitations verification" });
    }

    try {
      const report = await runAutomatedLimitationsCheck(activeCase, referenceDate);
      res.json(report);
    } catch (err: any) {
      console.error("[SERVER] Automated Limitations Checker error:", err);
      res.status(500).json({
        error: "Automated Statute of Limitations Verification failed.",
        details: err.message || "Unknown error occurred"
      });
    }
  });

  // High-Level Bulleted Executive Summary Endpoint using Gemini
  app.post("/api/case/summary", async (req, res) => {
    const { activeCase } = req.body;
    if (!activeCase) {
      return res.status(400).json({ error: "activeCase is required" });
    }

    try {
      const ai = getAiClient();
      
      const evidenceList = (activeCase.evidence || []).map((e: any, idx: number) => 
        `• Exhibit ${idx + 1} [${e.type || 'exhibit'}]: "${e.title}" (Date: ${e.date || 'N/A'})\n  Summary: ${e.summary || (e.content ? e.content.substring(0, 200) : 'N/A')}\n  Tags: ${(e.tags || []).join(', ')}`
      ).join('\n');

      const claimsList = (activeCase.claims || []).map((c: any, idx: number) =>
        `• Claim ${idx + 1}: "${c.title}"\n  Description: ${c.description || 'N/A'}\n  Associated Evidence IDs: ${(c.evidenceIds || []).join(', ') || 'None'}\n  Statute Citation: ${c.orsCitation || 'N/A'}`
      ).join('\n');

      const prompt = `You are a senior litigation strategist and appellate counsel specializing in Oregon jurisprudence (ORS, UTCR, ORCP).

Generate a high-level, bulleted executive summary of the current case based on existing evidence and claims.

CASE TITLE: "${activeCase.name || 'Untitled Case'}"
JURISDICTION: ${activeCase.jurisdiction || 'Circuit Court of Oregon'}
PROCEDURAL RULES: ${activeCase.courtRules || 'Oregon Uniform Trial Court Rules / ORCP'}

EXISTING LEGAL CLAIMS:
${claimsList || 'No legal claims formally pleaded.'}

EXISTING EVIDENCE MANIFOLD:
${evidenceList || 'No evidence exhibits cataloged.'}

PRACTITIONER SCRATCHPAD NOTES:
${activeCase.notes || 'None recorded.'}

INSTRUCTIONS FOR THE HIGH-LEVEL BULLETED EXECUTIVE SUMMARY:
- Provide an authoritative, high-level, bulleted executive briefing summarizing the case posture, factual strength, and tactical direction.
- Structure strictly into the following four clear bulleted sections:
  ### • Core Claims & Legal Causes of Action
  - Bulleted breakdown of active claims, their legal basis (ORS statutes/common law), and relief sought.
  ### • Key Evidentiary Facts & Proof Corroboration
  - Bulleted summary of the strongest evidentiary exhibits, confirmed incident dates, and key factual anchors that support the claims.
  ### • Evidentiary Vulnerabilities & Statute of Limitations Exposure
  - Bulleted assessment of any evidential gaps, missing documents, or timing/statutory limitations flags.
  ### • Strategic Counsel Action Items & Dispositive Motion Readiness
  - Action-oriented bullet points outlining immediate litigation priorities, summary judgment/limine positioning, and discovery tasks.
- Ensure every single entry is a concise, substantive, high-density bullet point.
- Do NOT include conversational opening or closing pleasantries. Output clean Markdown.`;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.8-flash",
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error("[SERVER] Case Executive Summary error:", err);
      res.status(500).json({
        error: "Failed to generate case executive summary.",
        details: err.message || "Unknown error occurred"
      });
    }
  });

  // Generic AI Generate Content proxy route
  app.post("/api/ai/generate", async (req, res) => {
    const { model, contents, config } = req.body;
    if (!contents) {
      return res.status(400).json({ error: "contents is required" });
    }

    try {
      const ai = getAiClient();
      const modelName = model || "gemini-3.8-flash";
      
      const response = await generateContentWithFallback(ai, {
        model: modelName,
        contents,
        config,
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error("[SERVER] AI Generation error:", err);
      res.status(500).json({
        error: "AI Generation failed.",
        details: err.message || "Unknown error occurred"
      });
    }
  });

  // AI Evidence Analysis & Auto-Tagging Endpoint (Legacy UI)
  app.post("/api/evidence/analyze-legacy", async (req, res) => {
    const { content, fileType } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Content is required for analysis." });
    }

    try {
      const ai = getAiClient();
      
      let contents: any = null;
      if (fileType && fileType.startsWith('image/')) {
        // Base64 image
        const base64Data = content.includes(',') ? content.split(',')[1] : content;
        contents = {
          parts: [
            { text: `Analyze this legal document image. Extract the following information:
              1. Title (descriptive case/document title)
              2. Date (YYYY-MM-DD format if found, otherwise empty string)
              3. Category (one of: 'exhibit', 'transcript', 'correspondence', 'pleading', 'other')
              4. Summary (concise 1-2 sentence legal and factual summary)
              5. Tags (Identify relevant high-importance tags. ALWAYS check for, classify, and apply:
                 - 'PII' (if containing SSN, DOB, home addresses, phone numbers, passport, private details)
                 - 'Financial' (if containing banking details, invoices, balances, transactions, salary, checks)
                 - 'Contract' (if containing agreements, leases, signs, terms, NDAs, commitments)
                 - 'Correspondence' (if containing mail correspondence, emails, letters, text messages)
                 Identify other custom legal/factual tags found, up to 5 tags total)` },
            { inlineData: { data: base64Data, mimeType: fileType } }
          ]
        };
      } else {
        // Plain text content
        contents = `Analyze the following legal document text. Extract the following properties:
          1. Title (descriptive case/document title)
          2. Date (YYYY-MM-DD format if found, otherwise empty string)
          3. Category (one of: 'exhibit', 'transcript', 'correspondence', 'pleading', 'other')
          4. Summary (concise 1-2 sentence legal and factual summary)
          5. Tags (Identify relevant high-importance tags. ALWAYS check for, classify, and apply:
             - 'PII' (if containing SSN, DOB, home addresses, phone numbers, private identity or credentials)
             - 'Financial' (if containing bank details, invoices, pricing, billing, transactions, tax, checks)
             - 'Contract' (if containing agreements, leases, signing, covenants, terms, NDAs)
             - 'Correspondence' (if containing emails, letters, communications, text chains, notes)
             Identify other custom legal/factual tags found, up to 5 tags total)

          FILE CONTENT:
          ${content.substring(0, 12000)}
          `;
      }

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              date: { type: Type.STRING },
              category: { type: Type.STRING, enum: ['exhibit', 'transcript', 'correspondence', 'pleading', 'other'] },
              summary: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["title", "date", "category", "summary", "tags"]
          }
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (err: any) {
      console.error("[SERVER] Evidence analysis error:", err);
      res.status(500).json({
        error: "AI Evidence Auto-Tagging and Analysis failed.",
        details: err.message || "Unknown error occurred"
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SYSTEM] Legal Manifold Server running on http://localhost:${PORT}`);
  });
}

startServer();
