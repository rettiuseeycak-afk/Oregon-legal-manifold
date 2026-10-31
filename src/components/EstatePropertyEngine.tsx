import React, { useState } from 'react';
import { generateContentProxy } from '../lib/geminiClient';
import { Case } from '../types';
import { Key, Home, Scroll, Loader2, FileText, AlertCircle, Map, Building } from 'lucide-react';
import { cn } from '../lib/utils';

interface EstatePropertyEngineProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
}

export const EstatePropertyEngine: React.FC<EstatePropertyEngineProps> = ({ activeCase, onUpdateCase }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const analyzeEstateProperty = async () => {
    setIsAnalyzing(true);
    
    try {
      const response = await generateContentProxy({
        model: "gemini-3.5-flash",
        contents: `Analyze this Oregon Estate and Property case:
          Name: ${activeCase.name}
          Jurisdiction: ${activeCase.jurisdiction}
          Court Rules: ${activeCase.courtRules}
          Claims: ${activeCase.claims.map(c => c.title).join(', ')}
          Evidence: ${activeCase.evidence.map(e => e.title).join(', ')}
          
          Focus on:
          1. ORS Chapter 90 (Residential Landlord and Tenant).
          2. ORS Chapter 112 (Intestate Succession and Wills).
          3. ORS Chapter 113 (Initiation of Estate Administration).
          4. ORS Chapter 105 (Property Rights).
          5. Oregon Trust Code (ORS Chapter 130).
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
          <Key className="w-5 h-5 text-amber-500" />
          <h2 className="text-xl font-serif italic text-zinc-100">Estate & Property Engine</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">ORS 90/112/105 Active</span>
          </div>
          <button
            onClick={analyzeEstateProperty}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-mono text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
          >
            {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scroll className="w-3.5 h-3.5" />}
            Analyze Estate Assets
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Building className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Landlord/Tenant (ORS 90)</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Oregon has strict notice requirements for evictions and habitability. Focus on the "FED" process (Forcible Entry and Detainer).
          </p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Scroll className="w-4 h-4 text-orange-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Probate & Wills (ORS 112)</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Small estate affidavits (ORS 114.515) can bypass full probate if the estate is under $275,000 ($200k real property, $75k personal).
          </p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Map className="w-4 h-4 text-green-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Property Rights (ORS 105)</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Adverse possession, partition, and quiet title actions. Requires specific statutory periods and "hostile" possession.
          </p>
        </div>
      </div>

      {analysis && (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-sm font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap">
          <div className="flex items-center gap-2 mb-4 text-amber-500">
            <FileText className="w-4 h-4" />
            <span className="uppercase tracking-widest">Strategic Roadmap (ORS 90/112/105)</span>
          </div>
          {analysis}
        </div>
      )}

      {!analysis && !isAnalyzing && (
        <div className="p-12 border border-dashed border-zinc-800 rounded-sm flex flex-col items-center justify-center text-zinc-600 space-y-4">
          <AlertCircle className="w-8 h-8 opacity-20" />
          <p className="text-[10px] font-mono uppercase tracking-widest">No active estate or property analysis</p>
        </div>
      )}
    </div>
  );
};
