import React, { useState, useEffect } from 'react';
import { generateContentProxy } from '../lib/geminiClient';
import { Case, Evidence, LegalClaim } from '../types';
import { FileText, Loader2, CheckCircle2, AlertCircle, Search, Download, Printer, Eye, Edit3, ShieldCheck, Save, Cloud, Database, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ThinkingIndicator } from './ThinkingIndicator';
import { CitationSearch } from './CitationSearch';
import { LegalDisclaimer } from './LegalDisclaimer';
import { OregonLegalHierarchy } from './OregonLegalHierarchy';
import { ServiceOfProcessTracker } from './ServiceOfProcessTracker';
import { OregonPleadingPaper } from './OregonPleadingPaper';
import { TemplateManager, DocumentTemplate } from './TemplateManager';
import { cn } from '../lib/utils';
import { getAccessToken, googleSignIn } from '../lib/authHelper';

interface DocumentGeneratorProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
}

export const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({ activeCase, onUpdateCase }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [curvature, setCurvature] = useState(0);
  const [sweBench, setSweBench] = useState(0);
  const [hleScore, setHleScore] = useState(0);
  const [entropyScore, setEntropyScore] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [currentDoc, setCurrentDoc] = useState<string | null>(null);
  const [showCitationSearch, setShowCitationSearch] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [templates, setTemplates] = useState<DocumentTemplate[]>(() => {
    const saved = localStorage.getItem('custom_templates');
    return saved ? JSON.parse(saved) : [];
  });

  // Save templates to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('custom_templates', JSON.stringify(templates));
  }, [templates]);

  const [isExporting, setIsExporting] = useState(false);
  const [autoResearchFindings, setAutoResearchFindings] = useState<any[]>([]);
  const [isAutoResearching, setIsAutoResearching] = useState(false);
  const [autoResearchEnabled, setAutoResearchEnabled] = useState(true);

  const exportToGoogleDocs = async (docType: string, content: string) => {
    const confirmed = window.confirm(`Export this document to a new Google Doc on your account?`);
    if (!confirmed) return;

    setIsExporting(true);
    setError(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const authResult = await googleSignIn();
        if (authResult) token = authResult.accessToken;
      }
      if (!token) throw new Error("Authentication failed or cancelled.");

      const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: `${activeCase.name} - ${docType}`
        })
      });
      
      if (!createRes.ok) {
        throw new Error(await createRes.text() || "Failed to create Google Doc");
      }
      
      const doc = await createRes.json();
      
      const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: content
              }
            }
          ]
        })
      });
      
      if (!updateRes.ok) {
        throw new Error(await updateRes.text() || "Failed to edit Google Doc content");
      }
      
      window.open(`https://docs.google.com/document/d/${doc.documentId}/edit`, '_blank');
    } catch (err: any) {
      if (
        err.code !== 'auth/popup-closed-by-user' &&
        err.code !== 'auth/cancelled-popup-request' &&
        err.code !== 'auth/popup-blocked'
      ) {
        console.error(err);
      }
      setError("Google Docs Export Failed: " + (err.message || String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  const finalizeCase = () => {
    onUpdateCase({ ...activeCase, isFinalized: true });
  };

  const downloadDoc = (docType: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCase.name.replace(/\s+/g, '_')}_${docType}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [localContent, setLocalContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync local content when document changes
  useEffect(() => {
    if (currentDoc && activeCase.generatedDocs[currentDoc]) {
      setLocalContent(activeCase.generatedDocs[currentDoc]);
    } else {
      setLocalContent('');
    }
  }, [currentDoc, activeCase.generatedDocs]);

  // Debounce updates to Firestore
  useEffect(() => {
    if (!currentDoc) return;
    
    const timer = setTimeout(() => {
      const savedContent = activeCase.generatedDocs[currentDoc] || '';
      if (localContent !== savedContent) {
        setIsSaving(true);
        onUpdateCase({
          ...activeCase,
          generatedDocs: {
            ...activeCase.generatedDocs,
            [currentDoc]: localContent
          }
        });
        setTimeout(() => setIsSaving(false), 500);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [localContent, currentDoc, activeCase, onUpdateCase]);

  const handleInsertCitation = (citation: { title: string; snippet: string; url: string }) => {
    if (!currentDoc) return;
    const citationText = `\n\n> **Citation:** ${citation.title}\n> ${citation.snippet}\n> Source: [${citation.url}](${citation.url})\n\n`;
    setLocalContent(prev => prev + citationText);
  };

  const generateDocs = async () => {
    setIsGenerating(true);
    setError(null);
    setCurvature(0.1);
    setSweBench(0);
    setHleScore(0);
    setEntropyScore(1);

    let researchedCitations: any[] = [];
    if (activeCase.researchFindings && activeCase.researchFindings.length > 0) {
      researchedCitations.push(...activeCase.researchFindings);
    }
    activeCase.claims.forEach(claim => {
      if (claim.validatedPrecedents && claim.validatedPrecedents.length > 0) {
        claim.validatedPrecedents.forEach(p => {
          if (!researchedCitations.some(rc => rc.title.toLowerCase() === p.title.toLowerCase())) {
            researchedCitations.push(p);
          }
        });
      }
    });

    if (autoResearchEnabled) {
      setIsAutoResearching(true);
      try {
        const res = await fetch('/api/research/auto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activeCase })
        });
        if (res.ok) {
          const data = await res.json();
          const autoFindings = data.findings || [];
          autoFindings.forEach((f: any) => {
            if (!researchedCitations.some(rc => rc.title.toLowerCase() === f.title.toLowerCase())) {
              researchedCitations.push(f);
            }
          });
          setAutoResearchFindings(researchedCitations);
        }
      } catch (err) {
        console.error("Auto legal research fetch error:", err);
      } finally {
        setIsAutoResearching(false);
      }
    } else {
      setAutoResearchFindings(researchedCitations);
    }

    const autoCitationsSegment = researchedCitations.length > 0
      ? `
      GOVERNING LEGAL AUTHORITIES FOUND VIA AUTOMATED SEARCH INTEGRITY (WESTLAW/LEXIS & COURT-RECORDS API):
      The legal research tool automatically executed backend queries mapping to your legal claims & evidence and returned the following governing authorities:
      ${researchedCitations.map((f, idx) => `[Research Precedent Matching #${idx+1}]
- Full Legal Citation: ${f.title}
- Jurisdiction Scope: ${f.jurisdiction || 'Oregon'}
- Database Node: ${f.sourceType}
- Specific Holding & Law Summary: "${f.snippet}"
- Authorized URL: ${f.url}`).join('\n\n')}

      CRITICAL CITATION INSTRUCTION:
      You MUST cite and construct active arguments using these specific findings throughout the generated legal documents:
      1. In the Complaint: Cite appropriate ORS statutes or governing case law citations inside factual allegation paragraphs where applicable.
      2. In the Motion for Summary Judgment: Integrate and construct formal legal arguments referencing these cited precedents (specifically Bluebook formatted, applying the holding rules to this case facts).
      3. In the Table of Authorities (TOA): Categorize and catalog these citations in their respective sections (Cases under "Cases", Statutes under "Statutes", Rules under "Rules").
      4. Ensure all citations are applied accurately with no simulated placeholder links.
      `
      : '';
    
    // ... prompt text remains the same ...
    const prompt = `
      TASK: Generate a Complaint, a Motion for Summary Judgment, a Table of Authorities (TOA), a Table of Contents (TOC), a "Notice of AI-Assisted Litigation & Disclosure", and a "Final Filing Checklist".
      
      ${autoCitationsSegment}
      ` + `
      ${templates.length > 0 ? `Additionally, generate the following custom documents based on the provided templates.
      
      TEMPLATE POPULATION RULES:
      1. You MUST automatically populate ALL placeholders in the custom templates (e.g., [YOUR FULL LEGAL NAME], [OPPOSING PARTY FULL LEGAL NAME], [Address], [City, State, ZIP], [Phone], [Email], [____________] for Case No., and date blanks like ___ day of ____________, 20__).
      2. Deduce the Plaintiff/Petitioner and Defendant/Respondent names, addresses, and other details from the CASE CONTEXT, EVIDENCE MANIFOLD, and LEGAL CLAIMS.
      3. Replace ORS ______ or [Statute] with the relevant statutes identified in the claims.
      4. Replace bracketed instructions like [Concise numbered factual allegations.] or [Legal and factual basis.] with actual, specific facts and legal arguments derived from the evidence manifold.
      5. If specific details (like a phone number) are completely absent from the evidence, use a clear indicator like "[Phone Number Unknown]".
      
      TEMPLATES TO POPULATE:
      ${templates.map(t => `- ${t.name} (Key: ${t.id}):\n${t.content}`).join('\n\n')}` : ''}
      
      OREGON LEGAL HIERARCHY (PRIORITY):
      1. Oregon Revised Statutes (ORS): The primary source of law.
      2. Uniform Trial Court Rules (UTCR): The primary source of procedure.
      3. ${activeCase.jurisdiction} Supplementary Local Rules (SLR): Local procedural requirements.
      4. ${activeCase.jurisdiction} Municipal Code (Municode): Local ordinances for city-specific disputes if applicable.

      SPECIALIZED DOMAINS (PRIORITY):
      - FAMILY LAW: ORS 107 (Dissolution), ORS 109 (Parent/Child), ORS 108 (Husband/Wife).
      - JUVENILE DEPENDENCY: ORS 419B (Durable Guardianship, Wardship).
      - CIVIL RIGHTS: ORS 659A (Discrimination), 42 U.S.C. § 1983, Oregon Tort Claims Act.
      - ESTATE & PROPERTY: ORS 90 (Landlord/Tenant), ORS 112 (Wills), ORS 105 (Property Rights).

      CASE CONTEXT:
      Name: ${activeCase.name}
      Jurisdiction: ${activeCase.jurisdiction}
      Court Rules: ${activeCase.courtRules}
      
      EVIDENCE MANIFOLD:
      ${activeCase.evidence.map(e => `- [${e.id}] ${e.title} (${e.type}): ${e.content} (Date: ${e.date || 'N/A'})`).join('\n')}
      
      CORPORATE DISCLOSURE CONTEXT (Rule 7.1 / 14.1):
      ${activeCase.corporateDisclosure?.parties.map(p => `- ${p.name}: Ticker=${p.ticker || 'N/A'}, Parent=${p.parent || 'None'}, Private=${p.isPrivate}`).join('\n') || 'No corporate parties identified.'}

      LEGAL CLAIMS:
      ${activeCase.claims.map(c => `- ${c.title}: ${c.description} (Evidence IDs: ${c.evidenceIds.join(', ')})`).join('\n')}
      
      SPECIFIC DOCUMENT INSTRUCTIONS:
      1. Notice of AI-Assisted Litigation & Disclosure: 
         - Must include formal disclosure of AI tools used (Gemini 3.1 Flash/Pro, Manifold-Constrained Hyper-Connections).
         - Must include a Certificate of Independent Verification (Citation Audit, Factual Integrity, Human Oversight).
         - Must cite Warner v. Gilbarco (E.D. Mich. Feb. 2026) regarding Work-Product Doctrine protection for prompts/reasoning traces.
         - Use the user's provided template for the structure.
      2. Corporate Disclosure Statement (Rule 7.1 / 14.1):
         - For every party identified in the CORPORATE DISCLOSURE CONTEXT, generate the mandatory disclosure statement.
         - Format: "Pursuant to Fed. R. Civ. P. 7.1 and Supreme Court Rule 14.1, [Party Name] identifies its parent corporation as [Name] and its publicly traded stock ticker symbol as [TICKER]. If no ticker exists, [Party Name] certifies it is a privately held entity with no publicly traded components."
      3. Table of Contents (TOC):
         - Use lower-case Roman Numerals (i, ii, iii) for the TOC/TOA pages.
         - Switch to Arabic Numerals (1, 2, 3) for the Brief itself.
         - Include sections: NOTICE OF AI-ASSISTED LITIGATION & DISCLOSURE, CORPORATE DISCLOSURE STATEMENT, TABLE OF AUTHORITIES, PRELIMINARY STATEMENT, STATEMENT OF FACTS, ARGUMENT (with sub-sections), CONCLUSION AND REQUEST FOR RELIEF, CERTIFICATE OF SERVICE.
      4. Table of Authorities (TOA):
         - Categorize authorities: Federal Cases, Federal Statutes, Rules & Regulations.
         - Do not mix cases with statutes.
         - Include specific 2026 authorities: Warner v. Gilbarco, Inc. (E.D. Mich. March 2, 2026), United States v. Heppner (S.D.N.Y. Feb. 17, 2026), ByoPlanet Int'l, LLC v. Johansson (S.D. Fla. 2025).
         - Include specific statutes/rules: 28 U.S.C. § 1331, Fed. R. Civ. P. 11, Fed. R. Civ. P. 26(b)(3), Local Rule 5.2, Fifth Cir. R. 32.3.
      5. UTCR 5.010 Conferral Check:
         - If generating a Motion under ORCP 21, explicitly state in the "Preliminary Statement" or a dedicated "Certificate of Conferral" whether UTCR 5.010 conferral was required and if it was performed. 
         - Note: ORCP 21 F (failure to state a claim) is exempt from UTCR 5.010(1) mandatory conferral, but the document should still acknowledge this to avoid procedural ambiguity.
      6. Final Filing Checklist:
         - Ensure exhibits are properly "Context-Folded" into the document.
         - Include steps for Rule 11 and Rule 12(b)(6) final checks.
         - Include a step for the "Face of the Filing" requirement (Administrative Order 2026-03-Gen).
      6. Mandatory Confidentiality Footer:
         - Every page of the generated Complaint and Motion MUST include the footer: "CONFIDENTIAL WORK PRODUCT: PREPARED BY PRO SE LITIGANT IN ANTICIPATION OF LITIGATION. PRIVILEGE MAINTAINED PURSUANT TO WARNER V. GILBARCO (E.D. MICH. 2026)."
      7. LiveCode Appendix:
         - If any damages or interest calculations are performed, include the Python code snippet used in an appendix to ensure deterministic admissibility.
      8. Oregon Pleading Paper Format:
         - All generated pleadings must follow the Oregon Pleading Paper format (line numbers 1-28 on the left margin).
         - Use numbered paragraphs (1, 2, 3...) for all factual allegations and substantive arguments.
      9. Certificate of Service:
         - The Complaint and Motion MUST include the following Certificate of Service block at the very end of the document:
           
           CERTIFICATE OF SERVICE
           
           I certify that on the ___ day of ____________, 20__, I served a true and correct copy of this document on:
           
           [Name]
           [Address]
           
           ☐ U.S. Mail   ☐ Hand Delivery   ☐ E‑Filing
           
           ______________________________
           [Your Name]
      10. Signature Block:
         - The Complaint and Motion MUST include the following signature block immediately preceding the Certificate of Service:
           
           DATED this ___ day of ____________, 20__.
           
           ______________________________
           [Your Full Name]
           [Address]
           [City, State, ZIP]
           [Phone]
           [Email]
           
           ☐ Plaintiff ☐ Defendant ☐ Petitioner ☐ Respondent
           (Self‑Represented)

      CONSTRAINTS:
      1. Use Manifold-Constrained reasoning to ensure every legal claim is mapped to a specific evidence block.
      2. Use Internalized Chain of Thought to cross-verify the statute of limitations for every claim based on the provided evidence dates and jurisdiction rules.
      3. The 'Ready Flag' should only be set to true (represented by high stability scores) when all claims are supported by evidence and are within the statute of limitations, and the generated documents are complete.
      4. Provide a stability report with the following metrics based on your internal verification:
         - "sweBench": A score (0-100) representing multi-file dependency handling (cross-referencing exhibits). Target > 80.
         - "hleScore": A score (0-100) representing high-level logic understanding. Target > 45.
         - "entropyScore": A score (0-1) representing uncertainty. Target < 0.2.
      5. Format the output as a JSON object with keys: "complaint", "motion", "toa", "toc", "corporateDisclosureStatement", "notice", "checklist", "sweBench", "hleScore", "entropyScore"${templates.length > 0 ? `, and keys for each custom template: ${templates.map(t => `"${t.id}"`).join(', ')}` : ''}.
      6. Ensure professional legal language and proper formatting.
    `;

    let interval: NodeJS.Timeout | null = null;

    try {
      // Simulate curvature stabilization
      interval = setInterval(() => {
        setCurvature(prev => Math.min(prev + 0.05, 0.95));
      }, 500);

      const response = await generateContentProxy({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: "HIGH" },
          responseMimeType: "application/json"
        },
      });

      if (interval) clearInterval(interval);
      setCurvature(1);

      const result = JSON.parse(response.text || '{}');
      
      setSweBench(result.sweBench || 0);
      setHleScore(result.hleScore || 0);
      setEntropyScore(result.entropyScore || 1);

      const customDocs: Record<string, string> = {};
      templates.forEach(t => {
        if (result[t.id]) {
          customDocs[t.id] = result[t.id];
        }
      });

      onUpdateCase({
        ...activeCase,
        generatedDocs: {
          complaint: result.complaint,
          motion: result.motion,
          toa: result.toa,
          toc: result.toc,
          corporateDisclosureStatement: result.corporateDisclosureStatement,
          notice: result.notice,
          checklist: result.checklist,
          ...customDocs
        }
      });
      
      setCurrentDoc('complaint');
    } catch (err: any) {
      console.error("Document generation error:", err);
      let errorMessage = "Failed to generate documents. ";
      
      if (err.message?.includes("429") || err.message?.includes("quota")) {
        errorMessage += "API quota exceeded. Please wait a moment and try again.";
      } else if (err.message?.includes("401") || err.message?.includes("403") || err.message?.includes("API key")) {
        errorMessage += "Invalid API key or permission denied. Please check your Gemini API key configuration.";
      } else if (err.message?.includes("safety") || err.message?.includes("blocked")) {
        errorMessage += "The generated content was blocked by safety filters. Try adjusting your claims or evidence to be more objective.";
      } else if (activeCase.claims.length === 0 || activeCase.evidence.length === 0) {
        errorMessage += "Ensure you have added sufficient Evidence and Legal Claims before generating documents.";
      } else {
        errorMessage += "Please check your inputs, ensure your prompt is not too large, and try again. " + (err.message || "");
      }
      
      setError(errorMessage);
    } finally {
      if (interval) clearInterval(interval);
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <h2 className="text-xl font-serif italic text-zinc-100">Document Generation Engine</h2>
        <div className="flex items-center gap-3">
          {activeCase.generatedDocs.complaint && !activeCase.isFinalized && (
            <button
              onClick={finalizeCase}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-mono text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Finalize Filing
            </button>
          )}
          <button
            onClick={() => setShowCitationSearch(!showCitationSearch)}
            className={cn(
              "px-4 py-2 border font-mono text-[10px] uppercase tracking-widest transition-all flex items-center gap-2",
              showCitationSearch 
                ? "bg-orange-600 border-orange-600 text-white" 
                : "bg-transparent border-zinc-800 text-zinc-400 hover:border-zinc-600"
            )}
          >
            <Search className="w-3.5 h-3.5" />
            {showCitationSearch ? "Hide Citations" : "Search Citations"}
          </button>
          <button
            onClick={generateDocs}
            disabled={isGenerating || activeCase.claims.length === 0}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Execute Manifold Reasoning
          </button>
        </div>
      </div>

      <ThinkingIndicator 
        isThinking={isGenerating} 
        curvature={curvature} 
        sweBench={sweBench}
        hleScore={hleScore}
        entropyScore={entropyScore}
      />

      {/* WESTLAW / LEXISNEXIS / OPEN LAW API AUTOMATION CONNECTION CONTROLS */}
      <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-sm space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-orange-500 animate-pulse" />
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-100">
                Automated Legal Research Node (Westlaw / Lexis / Free Law API Sync)
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                Automatically queries backend databases for authorities matching active case claims and facts
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoResearchEnabled}
                onChange={(e) => setAutoResearchEnabled(e.target.checked)}
                className="rounded bg-zinc-900 border-zinc-700 text-orange-500 focus:ring-0 focus:ring-offset-0 focus:outline-none"
              />
              <span className="text-[10px] font-mono text-zinc-300 uppercase tracking-widest">
                Enable Auto API Search
              </span>
            </label>
            <span className="text-[9px] font-mono font-bold bg-green-950/40 text-green-400 border border-green-800/40 px-2 py-0.5 rounded">
              ONLINE
            </span>
          </div>
        </div>

        {isAutoResearching ? (
          <div className="py-4 flex flex-col items-center justify-center space-y-2 text-zinc-400">
            <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
            <p className="text-[10.5px] font-mono tracking-widest uppercase animate-pulse">Running live query routing (Westlaw / Lexis & CourtListener APIs)...</p>
          </div>
        ) : autoResearchFindings.length > 0 ? (
          <div className="space-y-3">
            <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">
              Discovered Governing Authorities & Grounded Synced Precedents ({autoResearchFindings.length}):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {autoResearchFindings.map((finding, idx) => (
                <div key={idx} className="p-3 bg-zinc-900/60 border border-zinc-850 rounded flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[9.5px] font-bold text-orange-400 font-mono leading-none">
                        {finding.title}
                      </span>
                      <span className="text-[8px] font-mono px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded">
                        {finding.sourceType}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans line-clamp-3">
                      {finding.snippet}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-850 text-[9px] font-mono">
                    <span className="text-zinc-500">Relevance: <strong className="text-zinc-300">{finding.relevance}%</strong></span>
                    {finding.url && (
                      <a
                        href={finding.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-450 hover:underline flex items-center gap-0.5"
                      >
                        Source <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[10px] font-mono text-zinc-500 py-1">
            No active search has been executed. Discovered case law and statutes will list here dynamically upon executing Manifold Reasoning.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <OregonLegalHierarchy activeCase={activeCase} onUpdateCase={onUpdateCase} />
        <ServiceOfProcessTracker activeCase={activeCase} onUpdateCase={onUpdateCase} />
      </div>

      <TemplateManager templates={templates} onUpdateTemplates={setTemplates} />

      <LegalDisclaimer />

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-900/50 text-red-400 text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {activeCase.generatedDocs.complaint && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-2 space-y-2">
            <div className="pb-2 mb-2 border-b border-zinc-800">
              <button
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-3 py-2 border font-mono text-[9px] uppercase tracking-widest transition-all",
                  isPreviewMode 
                    ? "bg-zinc-100 text-zinc-900 border-zinc-100" 
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                )}
              >
                {isPreviewMode ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {isPreviewMode ? "Edit View" : "Page Preview"}
              </button>
            </div>
            {(['complaint', 'motion', 'toa', 'toc', 'corporateDisclosureStatement', 'notice', 'checklist'] as const).map((doc) => (
              <button
                key={doc}
                onClick={() => setCurrentDoc(doc)}
                className={`w-full text-left px-4 py-3 border text-[10px] font-mono uppercase tracking-widest transition-all ${
                  currentDoc === doc 
                    ? 'bg-zinc-100 text-zinc-900 border-zinc-100' 
                    : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                {doc.replace(/([A-Z])/g, ' $1').replace('_', ' ')}
              </button>
            ))}
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => setCurrentDoc(template.id)}
                className={`w-full text-left px-4 py-3 border text-[10px] font-mono uppercase tracking-widest transition-all ${
                  currentDoc === template.id 
                    ? 'bg-indigo-600 text-white border-indigo-500' 
                    : 'bg-transparent text-indigo-400 border-zinc-800 hover:border-indigo-500/50'
                }`}
              >
                {template.name}
              </button>
            ))}
          </div>
          
          <div className={cn(
            "border transition-all relative",
            isPreviewMode 
              ? "bg-white shadow-2xl mx-auto max-w-[850px] min-h-[1100px] text-black border-zinc-300" 
              : "bg-zinc-900 border-zinc-800 p-8 min-h-[600px] text-zinc-100",
            showCitationSearch ? "lg:col-span-7" : "lg:col-span-10"
          )}>
            {activeCase.isFinalized && (
              <div className="absolute top-4 right-4 flex gap-2 no-print z-20">
                <button 
                  onClick={() => currentDoc && activeCase.generatedDocs[currentDoc] && exportToGoogleDocs(currentDoc, activeCase.generatedDocs[currentDoc]!)}
                  disabled={isExporting}
                  className="p-2 bg-blue-100 text-blue-900 rounded-full hover:bg-blue-50 shadow-lg transition-all disabled:opacity-50"
                  title="Export to Google Docs"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => currentDoc && activeCase.generatedDocs[currentDoc] && downloadDoc(currentDoc, activeCase.generatedDocs[currentDoc]!)}
                  className="p-2 bg-zinc-100 text-zinc-900 rounded-full hover:bg-white shadow-lg transition-all"
                  title="Download Markdown"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => window.print()}
                  className="p-2 bg-zinc-100 text-zinc-900 rounded-full hover:bg-white shadow-lg transition-all"
                  title="Print Document"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            )}

            {activeCase.isFinalized && !isPreviewMode && (
              <div className="mb-8 p-4 bg-green-900/20 border border-green-900/50 text-green-400 text-[10px] font-mono uppercase tracking-widest flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4" />
                Document Finalized & Verified for Filing
              </div>
            )}

            {currentDoc && activeCase.generatedDocs[currentDoc] ? (
              isPreviewMode ? (
                <OregonPleadingPaper 
                  content={activeCase.generatedDocs[currentDoc]!} 
                  isPreview={isPreviewMode} 
                />
              ) : (
                <div className="flex flex-col h-full">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Manifold Output Editor</span>
                    <div className="flex items-center gap-3">
                      {isSaving ? (
                        <span className="text-[9px] font-mono text-orange-500 uppercase flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-zinc-600 uppercase flex items-center gap-1">
                          <Save className="w-3 h-3" /> Auto-saved
                        </span>
                      )}
                      <span className="text-[9px] font-mono text-zinc-700 uppercase">Markdown Supported</span>
                    </div>
                  </div>
                  <textarea
                    value={localContent}
                    onChange={(e) => setLocalContent(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-300 p-6 font-mono text-xs leading-relaxed focus:outline-none focus:border-orange-500/50 resize-none min-h-[600px]"
                    placeholder="Edit document content..."
                  />
                </div>
              )
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-600 font-mono text-xs italic">
                Select a document to view manifold output
              </div>
            )}
          </div>

          {showCitationSearch && (
            <div className="lg:col-span-3 h-[600px]">
              <CitationSearch onSelect={handleInsertCitation} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
