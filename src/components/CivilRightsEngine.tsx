import React, { useState } from 'react';
import { generateContentProxy } from '../lib/geminiClient';
import { Case } from '../types';
import { Shield, Scale, AlertCircle, Loader2, FileText, Gavel, UserCheck, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

interface CivilRightsEngineProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
}

export const CivilRightsEngine: React.FC<CivilRightsEngineProps> = ({ activeCase, onUpdateCase }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const analyzeCivilRights = async () => {
    setIsAnalyzing(true);
    
    try {
      const response = await generateContentProxy({
        model: "gemini-3.5-flash",
        contents: `Analyze this Oregon Civil Rights case:
          Name: ${activeCase.name}
          Jurisdiction: ${activeCase.jurisdiction}
          Court Rules: ${activeCase.courtRules}
          Claims: ${activeCase.claims.map(c => c.title).join(', ')}
          Evidence: ${activeCase.evidence.map(e => e.title).join(', ')}
          
          Focus on:
          1. ORS Chapter 659A (Unlawful Discrimination).
          2. 42 U.S.C. § 1983 (Civil Action for Deprivation of Rights).
          3. Qualified Immunity standards in the 9th Circuit.
          4. Oregon Tort Claims Act (ORS 30.260 to 30.300).
          5. Procedural requirements for BOLI (Bureau of Labor and Industries) complaints.
          6. Apply specific local rules for ${activeCase.jurisdiction} if available in ${activeCase.courtRules}.
          
          Provide a strategic roadmap for a pro se litigant in ${activeCase.jurisdiction}.`,
      });
      setAnalysis(response.text || "No analysis generated.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-serif italic text-zinc-100">Civil Rights & Constitutional Engine</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">ORS 659A / § 1983 Active</span>
          </div>
          <button
            onClick={analyzeCivilRights}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
          >
            {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />}
            Analyze Constitutional Claims
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Discrimination (ORS 659A)</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Oregon's anti-discrimination laws (ORS 659A) are broader than federal law. Focus on protected classes and BOLI exhaustion.
          </p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Gavel className="w-4 h-4 text-orange-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Section 1983 Claims</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Federal claims for deprivation of rights. Requires proof of "color of law" and direct constitutional violation.
          </p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-red-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Qualified Immunity</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            The primary defense for government officials. Must show the right was "clearly established" at the time of the violation.
          </p>
        </div>
      </div>

      {analysis && (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-sm font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap">
          <div className="flex items-center gap-2 mb-4 text-blue-500">
            <FileText className="w-4 h-4" />
            <span className="uppercase tracking-widest">Strategic Roadmap (ORS 659A / § 1983)</span>
          </div>
          {analysis}
        </div>
      )}

      {!analysis && !isAnalyzing && (
        <div className="p-12 border border-dashed border-zinc-800 rounded-sm flex flex-col items-center justify-center text-zinc-600 space-y-4">
          <AlertCircle className="w-8 h-8 opacity-20" />
          <p className="text-[10px] font-mono uppercase tracking-widest">No active civil rights analysis</p>
        </div>
      )}
    </div>
  );
};
