import React, { useState } from 'react';
import { Case } from '../types';
import { Building2, Plus, Trash2, ShieldCheck, AlertCircle, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { CitationSearch } from './CitationSearch';

interface CorporateDisclosureProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
}

export const CorporateDisclosure: React.FC<CorporateDisclosureProps> = ({ activeCase, onUpdateCase }) => {
  const [showCitationSearch, setShowCitationSearch] = useState(false);
  const disclosure = activeCase.corporateDisclosure || { parties: [] };

  const addParty = () => {
    onUpdateCase({
      ...activeCase,
      corporateDisclosure: {
        ...disclosure,
        parties: [...disclosure.parties, { name: '', ticker: '', parent: '', isPrivate: false }]
      }
    });
  };

  const updateParty = (idx: number, updates: Partial<typeof disclosure.parties[0]>) => {
    const newParties = [...disclosure.parties];
    newParties[idx] = { ...newParties[idx], ...updates };
    onUpdateCase({
      ...activeCase,
      corporateDisclosure: { ...disclosure, parties: newParties }
    });
  };

  const removeParty = (idx: number) => {
    const newParties = disclosure.parties.filter((_, i) => i !== idx);
    onUpdateCase({
      ...activeCase,
      corporateDisclosure: { ...disclosure, parties: newParties }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-orange-500" />
          <h2 className="text-xl font-serif italic text-zinc-100">Corporate Disclosure & Conflict-Check</h2>
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
            onClick={addParty}
            className="px-6 py-2 bg-zinc-100 hover:bg-white text-zinc-900 font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Party
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={cn(
          "space-y-6 transition-all duration-500",
          showCitationSearch ? "lg:col-span-8" : "lg:col-span-12"
        )}>
          <div className="p-4 bg-orange-900/10 border border-orange-900/30 rounded-sm flex items-start gap-4">
            <ShieldCheck className="w-5 h-5 text-orange-500 shrink-0 mt-1" />
            <div className="space-y-2">
              <p className="text-[11px] font-mono font-bold text-zinc-200 uppercase tracking-widest">Rule 7.1 / Rule 14.1 Compliance</p>
              <p className="text-[10px] text-zinc-500 font-mono leading-relaxed italic">
                As of March 16, 2026, you must identify every nongovernmental corporate party and their Stock Ticker Symbol. 
                Failing to include a ticker is grounds for an immediate "Deficiency Notice."
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {disclosure.parties.map((party, idx) => (
              <div key={idx} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-zinc-600">0{idx + 1}</span>
                    <h3 className="text-xs font-mono font-bold text-zinc-200 uppercase tracking-widest">Party Information</h3>
                  </div>
                  <button 
                    onClick={() => removeParty(idx)}
                    className="text-zinc-600 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Party Name</label>
                    <input
                      type="text"
                      value={party.name}
                      onChange={(e) => updateParty(idx, { name: e.target.value })}
                      placeholder="e.g., Apple Inc."
                      className="w-full bg-zinc-950 border border-zinc-800 p-3 text-zinc-300 font-mono text-xs focus:border-orange-900 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Parent Corporation</label>
                    <input
                      type="text"
                      value={party.parent}
                      onChange={(e) => updateParty(idx, { parent: e.target.value })}
                      placeholder="If applicable..."
                      className="w-full bg-zinc-950 border border-zinc-800 p-3 text-zinc-300 font-mono text-xs focus:border-orange-900 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Stock Ticker Symbol</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={party.ticker}
                        onChange={(e) => updateParty(idx, { ticker: e.target.value.toUpperCase() })}
                        disabled={party.isPrivate}
                        placeholder="e.g., NASDAQ: AAPL"
                        className={cn(
                          "w-full bg-zinc-950 border border-zinc-800 p-3 text-zinc-300 font-mono text-xs focus:border-orange-900 outline-none transition-all",
                          party.isPrivate && "opacity-50 cursor-not-allowed"
                        )}
                      />
                      {party.ticker && !party.isPrivate && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={party.isPrivate}
                        onChange={(e) => updateParty(idx, { isPrivate: e.target.checked, ticker: e.target.checked ? '' : party.ticker })}
                        className="w-4 h-4 bg-zinc-950 border border-zinc-800 rounded-sm text-orange-600 focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">
                        Privately Held Entity (No Ticker)
                      </span>
                    </label>
                  </div>
                </div>

                {party.name && (
                  <div className="pt-4 border-t border-zinc-800/50">
                    <p className="text-[10px] font-mono text-zinc-500 italic">
                      "Pursuant to Fed. R. Civ. P. 7.1 and Supreme Court Rule 14.1, {party.name} identifies its parent corporation as {party.parent || 'None'} and its publicly traded stock ticker symbol as {party.isPrivate ? 'N/A (Privately Held)' : (party.ticker || '[TICKER REQUIRED]')}. {party.isPrivate ? `${party.name} certifies it is a privately held entity with no publicly traded components.` : ''}"
                    </p>
                  </div>
                )}
              </div>
            ))}

            {disclosure.parties.length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-sm text-zinc-700 space-y-4">
                <Building2 className="w-12 h-12 opacity-20" />
                <p className="text-[10px] font-mono uppercase tracking-widest">No Parties Added for Disclosure</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-sm flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-zinc-600 shrink-0 mt-1" />
            <div className="space-y-2">
              <p className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-widest">March 18 "Section 16(a)" Trap</p>
              <p className="text-[10px] text-zinc-600 font-mono leading-relaxed italic">
                If your case involves Foreign Private Issuers (FPIs), check if insiders have filed their Form 3 or Form 4 on EDGAR Next. 
                If they missed the March 18 deadline, you may have a new "Negligence Per Se" claim to add to your case.
              </p>
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
