import React, { useState } from 'react';
import { Case } from '../types';
import { generateContentProxy } from '../lib/geminiClient';
import { MessageSquare, Loader2, AlertCircle, Search, ShieldCheck, Clock, Anchor, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { CitationSearch } from './CitationSearch';
import ReactMarkdown from 'react-markdown';

enum Type {
  OBJECT = 'OBJECT',
  ARRAY = 'ARRAY',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
}

interface InterrogatoryGeneratorProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
}

export const InterrogatoryGenerator: React.FC<InterrogatoryGeneratorProps> = ({ activeCase, onUpdateCase }) => {
  const [theory, setTheory] = useState(activeCase.interrogatories?.theory || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCitationSearch, setShowCitationSearch] = useState(false);

  const generateInterrogatories = async () => {
    if (!theory.trim()) {
      setError("Please provide your core legal theory first.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    const prompt = `
      TASK: Generate 25 RA3 (Reasoning-Augmented, Action-Abstracted) Interrogatories.
      
      LEGAL THEORY:
      ${theory}
      
      EVIDENCE MANIFOLD (EXHIBIT AUDIT):
      ${activeCase.evidence.map(e => `- [${e.id}] ${e.title}: ${e.content}`).join('\n')}
      
      CONSTRAINTS:
      1. Use "Action Abstraction" phrasing: Instead of asking "Did you send this email?", ask "Identify the specific protocol followed to authorize the transmission of the data contained in Exhibit [X]." This prevents dodging by focusing on the process/action rather than the specific artifact.
      2. Frame around "Temporal Invariants": Focus on actions that MUST have occurred for the current state to exist. (e.g., "Identify the specific person who verified the accuracy of the data before it was uploaded to the server on Jan 5th").
      3. Cross-reference each question to a specific [Factual Anchor] from the Exhibit Audit provided.
      4. Include a "Reasoning Trace" for each: Explain why this specific wording bypasses common 2026 defense objections like "Overly Broad," "Undue Burden," or "Vague."
      
      OUTPUT FORMAT:
      Return a JSON object with a "results" array. Each item in the array must have:
      - "question": The interrogatory text.
      - "anchor": The specific Exhibit ID/Anchor reference.
      - "reasoning": The Reasoning Trace explaining the tactical advantage.
    `;

    try {
      const response = await generateContentProxy({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: "HIGH" },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              results: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    anchor: { type: Type.STRING },
                    reasoning: { type: Type.STRING }
                  },
                  required: ["question", "anchor", "reasoning"]
                }
              }
            },
            required: ["results"]
          }
        },
      });

      const result = JSON.parse(response.text || '{"results": []}');
      
      onUpdateCase({
        ...activeCase,
        interrogatories: {
          theory,
          results: result.results
        }
      });
    } catch (err: any) {
      setError(err.message || "Failed to generate interrogatories.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-orange-500" />
          <h2 className="text-xl font-serif italic text-zinc-100">RA3 Interrogatory Generator</h2>
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
            {showCitationSearch ? "Hide Ticker Search" : "Search Stock Tickers"}
          </button>
          <button
            onClick={generateInterrogatories}
            disabled={isGenerating}
            className="px-6 py-2 bg-zinc-100 hover:bg-white text-zinc-900 font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
            Generate RA3 Set
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={cn(
          "space-y-6 transition-all duration-500",
          showCitationSearch ? "lg:col-span-8" : "lg:col-span-12"
        )}>
          <div className="space-y-4">
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-sm space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-orange-500" />
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Core Legal Theory / Case Strategy</label>
              </div>
              <textarea
                value={theory}
                onChange={(e) => setTheory(e.target.value)}
                placeholder="Paste your core legal theory here... (e.g., 'The defendant knowingly bypassed safety protocols to prioritize speed over accuracy, as evidenced by the Jan 5th data transmission...')"
                className="w-full h-32 bg-zinc-950 border border-zinc-800 p-4 text-zinc-300 font-mono text-xs focus:border-orange-900 outline-none transition-all resize-none"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-900/20 border border-red-900/50 text-red-400 text-xs font-mono flex items-center gap-3">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              {activeCase.interrogatories?.results.map((item, idx) => (
                <div key={idx} className="bg-zinc-900/30 border border-zinc-800 rounded-sm overflow-hidden group">
                  <div className="flex items-center justify-between p-4 bg-zinc-900/50 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-zinc-600">INT-0{idx + 1}</span>
                      <div className="flex items-center gap-2 px-2 py-0.5 bg-orange-900/20 border border-orange-900/30 rounded-full">
                        <Anchor className="w-3 h-3 text-orange-500" />
                        <span className="text-[9px] font-mono text-orange-500 uppercase tracking-widest">{item.anchor}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Interrogatory</p>
                      <p className="text-sm font-serif text-zinc-200 leading-relaxed italic">
                        "{item.question}"
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-950 border-l-2 border-orange-600 space-y-2">
                      <div className="flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 text-orange-500" />
                        <p className="text-[9px] font-mono uppercase tracking-widest text-orange-500">Reasoning Trace (2026 Defense Bypass)</p>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-mono leading-relaxed italic">
                        {item.reasoning}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {(!activeCase.interrogatories || activeCase.interrogatories.results.length === 0) && !isGenerating && (
                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-sm text-zinc-700 space-y-4">
                  <MessageSquare className="w-12 h-12 opacity-20" />
                  <p className="text-[10px] font-mono uppercase tracking-widest">No Interrogatories Generated Yet</p>
                </div>
              )}

              {isGenerating && (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-zinc-900/50 border border-zinc-800 rounded-sm" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {showCitationSearch && (
          <div className="lg:col-span-4">
            <CitationSearch />
          </div>
        )}
      </div>
    </div>
  );
};
