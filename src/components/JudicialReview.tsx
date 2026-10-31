import React, { useState } from 'react';
import { generateContentProxy } from '../lib/geminiClient';
import { Case } from '../types';
import { Gavel, Loader2, AlertTriangle, Search, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ThinkingIndicator } from './ThinkingIndicator';
import { CitationSearch } from './CitationSearch';
import { cn } from '../lib/utils';

interface JudicialReviewProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
}

export const JudicialReview: React.FC<JudicialReviewProps> = ({ activeCase, onUpdateCase }) => {
  const [input, setInput] = useState(activeCase.judicialReview?.input || activeCase.rectificationScan?.input || '');
  const [isReviewing, setIsReviewing] = useState(false);
  const [report, setReport] = useState(activeCase.judicialReview?.report || '');
  const [curvature, setCurvature] = useState(0);
  const [sweBench, setSweBench] = useState(0);
  const [hleScore, setHleScore] = useState(0);
  const [entropyScore, setEntropyScore] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [showCitationSearch, setShowCitationSearch] = useState(false);

  const runReview = async () => {
    if (!input.trim()) return;
    
    setIsReviewing(true);
    setError(null);
    setCurvature(0.1);
    setSweBench(0);
    setHleScore(0);
    setEntropyScore(1);
    setReport('');

    const isFederal = activeCase.jurisdiction.toLowerCase().includes('federal') || activeCase.jurisdiction.toLowerCase().includes('district');
    const judgePersona = isFederal ? "Senior Federal District Judge" : `Senior ${activeCase.jurisdiction} Circuit Court Judge`;

    const prompt = `
      PERSONA:
      You are a ${judgePersona} with 30 years of experience. You have a zero-tolerance policy for "AI-slop," circular reasoning, and unsubstantiated legal conclusions.
      
      JURISDICTIONAL CONTEXT:
      Jurisdiction: ${activeCase.jurisdiction}
      Court Rules: ${activeCase.courtRules}
      
      OBJECTIVE:
      Conduct a "Supervised Reinforcement" review of the attached Pro Se filing. Your goal is to "Sustain" or "Overrule" every paragraph based on Rule 11 (frivolousness) and Rule 12(b)(6) (failure to state a claim), applying the specific rules of ${activeCase.jurisdiction} and ${activeCase.courtRules}.
      
      REVIEW PROTOCOL:
      1. Citation Verification: Flag any case citation that lacks a specific pinpoint page or seems semantically drifted.
      2. Logical Action Abstraction (RA3): Identify where the "Action Abstraction" (the legal move) is missing a "Latent Structure" (the actual fact).
      3. The "So What?" Test: For every claim, ask: "Even if this fact is true, does the law actually provide a remedy?"
      
      INPUT DOCUMENT:
      ${input}
      
      OUTPUT FORMAT:
      ## JUDICIAL REDLINE REPORT
      ### Paragraph [X]: [Status: SUSTAINED / STRIKE RECOMMENDED]
      - Reasoning: [Why a judge would find this weak]
      - Adversarial Counter: [What the opposing lawyer will say to destroy this point]
      - Required Reinforcement: [The specific factual "Anchor" needed to save it]
      
      Also, provide a stability report with the following metrics based on your internal verification:
      - "sweBench": A score (0-100) representing multi-file dependency handling. Target > 80.
      - "hleScore": A score (0-100) representing high-level logic understanding. Target > 45.
      - "entropyScore": A score (0-1) representing uncertainty. Target < 0.2.
      
      Format the entire response as a JSON object with keys: "report", "sweBench", "hleScore", "entropyScore".
    `;

    try {
      const interval = setInterval(() => {
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

      clearInterval(interval);
      setCurvature(1);

      const result = JSON.parse(response.text || '{}');
      
      setSweBench(result.sweBench || 0);
      setHleScore(result.hleScore || 0);
      setEntropyScore(result.entropyScore || 1);
      setReport(result.report || '');

      onUpdateCase({
        ...activeCase,
        judicialReview: {
          input,
          report: result.report
        }
      });
    } catch (err: any) {
      setError(err.message || "Failed to execute judicial review.");
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Gavel className="w-5 h-5 text-orange-500" />
          <h2 className="text-xl font-serif italic text-zinc-100">Senior Judicial Review (Rule 11/12)</h2>
        </div>
        <div className="flex items-center gap-3">
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
            onClick={runReview}
            disabled={isReviewing || !input.trim()}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            {isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Execute Judicial Review
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className={cn(
          "space-y-4 transition-all",
          showCitationSearch ? "lg:col-span-5" : "lg:col-span-6"
        )}>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Legal Draft for Review</label>
            <span className="text-[9px] font-mono text-zinc-700 uppercase italic">Senior Judge Persona Active</span>
          </div>
          <textarea
            rows={20}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="[PASTE YOUR RECTIFIED LEGAL DRAFT HERE]"
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 p-6 text-xs font-mono focus:outline-none focus:border-zinc-600 resize-none leading-relaxed"
          />
          
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-sm space-y-3">
            <div className="flex items-center gap-2 text-zinc-400">
              <FileText className="w-4 h-4" />
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Review Protocol: RA3 & Rule 11</span>
            </div>
            <p className="text-[10px] text-zinc-600 font-mono leading-relaxed italic">
              This review simulates a Senior Federal Judge's scrutiny. It flags semantic drift, missing latent structures, and frivolous claims that fail the "So What?" test.
            </p>
          </div>
        </div>

        <div className={cn(
          "space-y-6 transition-all",
          showCitationSearch ? "lg:col-span-4" : "lg:col-span-6"
        )}>
          <ThinkingIndicator 
            isThinking={isReviewing} 
            curvature={curvature} 
            sweBench={sweBench}
            hleScore={hleScore}
            entropyScore={entropyScore}
          />

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-900/50 text-red-400 text-xs font-mono flex items-center gap-3">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {report && (
            <div className="bg-zinc-900 border border-zinc-800 p-8 overflow-auto min-h-[600px] prose prose-invert prose-zinc max-w-none">
              <ReactMarkdown>{report}</ReactMarkdown>
              
              <div className="mt-8 p-4 border border-zinc-800 bg-zinc-950/50 rounded-sm">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span className="text-[9px] font-mono text-zinc-400 uppercase">Judicial Scrutiny Complete</span>
                </div>
                <p className="text-[9px] font-mono text-zinc-600 leading-tight">
                  The draft has been stress-tested against Rule 11 and 12(b)(6) standards. 
                  Address all "STRIKE RECOMMENDED" paragraphs to ensure manifold stability.
                </p>
              </div>
            </div>
          )}
          
          {!isReviewing && !report && (
            <div className="h-full border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-700 space-y-4 p-12">
              <Gavel className="w-12 h-12 opacity-10" />
              <div className="text-center">
                <p className="text-[10px] font-mono uppercase tracking-widest">Awaiting Judicial Review</p>
                <p className="text-[9px] font-mono uppercase tracking-tighter opacity-50">Execute review to generate Judicial Redline Report</p>
              </div>
            </div>
          )}
        </div>

        {showCitationSearch && (
          <div className="lg:col-span-3 h-[800px]">
            <CitationSearch />
          </div>
        )}
      </div>
    </div>
  );
};
