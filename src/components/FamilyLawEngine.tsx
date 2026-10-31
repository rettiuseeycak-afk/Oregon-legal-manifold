import React, { useState } from 'react';
import { generateContentProxy } from '../lib/geminiClient';
import { Case } from '../types';
import { Heart, Users, Baby, Home, Loader2, ShieldCheck, AlertTriangle, FileText } from 'lucide-react';
import { cn } from '../lib/utils';

interface FamilyLawEngineProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
}

export const FamilyLawEngine: React.FC<FamilyLawEngineProps> = ({ activeCase, onUpdateCase }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const analyzeFamilyCase = async () => {
    setIsAnalyzing(true);
    
    try {
      const response = await generateContentProxy({
        model: "gemini-3.5-flash",
        contents: `Analyze this Oregon Family Law case:
          Name: ${activeCase.name}
          Jurisdiction: ${activeCase.jurisdiction}
          Court Rules: ${activeCase.courtRules}
          Claims: ${activeCase.claims.map(c => c.title).join(', ')}
          Evidence: ${activeCase.evidence.map(e => e.title).join(', ')}
          
          Focus on:
          1. ORS Chapter 107 (Marital Dissolution, Annulment, Separation)
          2. ORS Chapter 109 (Parent and Child Rights and Relationships)
          3. Best Interests of the Child standard in Oregon.
          4. Property division (Equitable Distribution in Oregon).
          5. Spousal support types (Transitional, Compensatory, Maintenance).
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
          <Heart className="w-5 h-5 text-pink-500" />
          <h2 className="text-xl font-serif italic text-zinc-100">Family Law Strategy Engine</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">ORS 107/109 Active</span>
          </div>
          <button
            onClick={analyzeFamilyCase}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white font-mono text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
          >
            {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
            Analyze Domestic Relations
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Baby className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Custody & Parenting</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Oregon courts use the "Best Interests of the Child" standard (ORS 107.137). Focus on continuity of care and safety.
          </p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Home className="w-4 h-4 text-orange-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Property Division</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Oregon is an equitable distribution state. Assets acquired during marriage are presumed to be joint (ORS 107.105).
          </p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Support & Maintenance</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Child support is calculated via the Oregon Child Support Guidelines. Spousal support requires specific statutory findings.
          </p>
        </div>
      </div>

      {analysis && (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-sm font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap">
          <div className="flex items-center gap-2 mb-4 text-pink-500">
            <FileText className="w-4 h-4" />
            <span className="uppercase tracking-widest">Strategic Roadmap (ORS 107/109)</span>
          </div>
          {analysis}
        </div>
      )}

      {!analysis && !isAnalyzing && (
        <div className="p-12 border border-dashed border-zinc-800 rounded-sm flex flex-col items-center justify-center text-zinc-600 space-y-4">
          <AlertTriangle className="w-8 h-8 opacity-20" />
          <p className="text-[10px] font-mono uppercase tracking-widest">No active domestic relations analysis</p>
        </div>
      )}
    </div>
  );
};
