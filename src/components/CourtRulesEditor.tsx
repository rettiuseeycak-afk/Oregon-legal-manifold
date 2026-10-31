import React, { useState, useEffect, useMemo } from 'react';
import { Gavel, Save, Loader2, Book, Plus, Search, X } from 'lucide-react';
import manifoldData from '../data/oregonLegalManifold.json';
import { OregonLegalManifold } from '../types';

const manifold = manifoldData as OregonLegalManifold;

interface CourtRulesEditorProps {
  rules: string;
  onUpdate: (rules: string) => void;
  jurisdiction: string;
  onUpdateJurisdiction: (jurisdiction: string) => void;
}

export const CourtRulesEditor: React.FC<CourtRulesEditorProps> = ({ 
  rules, 
  onUpdate, 
  jurisdiction, 
  onUpdateJurisdiction 
}) => {
  const [localRules, setLocalRules] = useState(rules);
  const [localJurisdiction, setLocalJurisdiction] = useState(jurisdiction);
  const [isSaving, setIsSaving] = useState(false);
  const [showManifold, setShowManifold] = useState(false);
  const [manifoldSearch, setManifoldSearch] = useState('');

  const filteredManifoldRules = useMemo(() => {
    return manifold.rules.filter(r => 
      r.title.toLowerCase().includes(manifoldSearch.toLowerCase()) ||
      r.citation.toLowerCase().includes(manifoldSearch.toLowerCase())
    );
  }, [manifoldSearch]);

  const handleImportRule = (rule: any) => {
    const ruleText = `\n\n--- IMPORTED RULE: ${rule.citation} ---\nTITLE: ${rule.title}\nCATEGORY: ${rule.category}\nNOTES: ${rule.notes || 'N/A'}\nDEADLINE: ${rule.deadline?.period || 'N/A'}\n---------------------------\n`;
    setLocalRules(prev => prev + ruleText);
  };

  useEffect(() => {
    setLocalRules(rules);
  }, [rules]);

  useEffect(() => {
    setLocalJurisdiction(jurisdiction);
  }, [jurisdiction]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localRules !== rules) {
        setIsSaving(true);
        onUpdate(localRules);
        setTimeout(() => setIsSaving(false), 500);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [localRules, rules, onUpdate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localJurisdiction !== jurisdiction) {
        setIsSaving(true);
        onUpdateJurisdiction(localJurisdiction);
        setTimeout(() => setIsSaving(false), 500);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [localJurisdiction, jurisdiction, onUpdateJurisdiction]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-serif italic text-zinc-100">Local Court Rules</h2>
          {isSaving ? (
            <span className="text-[10px] font-mono uppercase tracking-widest text-orange-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
            </span>
          ) : (
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 flex items-center gap-1">
              <Save className="w-3 h-3" /> Auto-saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowManifold(!showManifold)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-900/20 border border-indigo-800/50 text-indigo-400 hover:bg-indigo-900/40 transition-all rounded-sm text-[10px] font-mono uppercase tracking-widest"
          >
            <Book className="w-3 h-3" />
            {showManifold ? 'Close Manifold' : 'Oregon Manifold'}
          </button>
          <div className="h-4 w-px bg-zinc-800 mx-2" />
          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Jurisdiction</label>
          <input
            type="text"
            list="jurisdictions"
            value={localJurisdiction}
            onChange={(e) => setLocalJurisdiction(e.target.value)}
            placeholder="e.g., Multnomah County"
            className="bg-zinc-950 border border-zinc-800 text-zinc-200 px-3 py-1.5 text-xs focus:outline-none focus:border-orange-500 w-64"
          />
          <datalist id="jurisdictions">
            <option value="Multnomah County Circuit Court" />
            <option value="Washington County Circuit Court" />
            <option value="Clackamas County Circuit Court" />
            <option value="Lane County Circuit Court" />
            <option value="Marion County Circuit Court" />
            <option value="Jackson County Circuit Court" />
            <option value="Deschutes County Circuit Court" />
            <option value="Baker County Circuit Court" />
            <option value="Federal District Court of Oregon" />
            <option value="Oregon Court of Appeals" />
            <option value="Oregon Supreme Court" />
          </datalist>
        </div>
      </div>

      {showManifold && (
        <div className="bg-zinc-900 border border-indigo-900/30 rounded-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-indigo-950/10">
            <div className="flex items-center gap-2">
              <Book className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-300">Oregon Legal Manifold Explorer</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
              <input 
                type="text"
                placeholder="Search rules..."
                value={manifoldSearch}
                onChange={(e) => setManifoldSearch(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-300 pl-7 pr-3 py-1 text-[10px] focus:outline-none focus:border-indigo-500 w-48"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredManifoldRules.map(rule => (
              <div key={rule.rule_id} className="p-2 bg-zinc-950 border border-zinc-800 hover:border-indigo-800 transition-all flex items-center justify-between group">
                <div className="truncate pr-4">
                  <p className="text-[9px] font-mono text-indigo-400 uppercase tracking-tighter">{rule.citation}</p>
                  <p className="text-[10px] font-bold text-zinc-300 truncate">{rule.title}</p>
                </div>
                <button 
                  onClick={() => handleImportRule(rule)}
                  className="p-1 hover:bg-indigo-900/40 text-zinc-600 hover:text-indigo-400 transition-all"
                  title="Import Rule"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <div className="absolute top-4 left-4 text-zinc-800">
          <Gavel className="w-12 h-12" />
        </div>
        <textarea
          rows={12}
          value={localRules}
          onChange={(e) => setLocalRules(e.target.value)}
          placeholder="Paste local court rules, statutes of limitations, and procedural requirements here..."
          className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 p-8 pt-12 text-xs font-mono focus:outline-none focus:border-zinc-600 resize-none leading-relaxed"
        />
        <div className="absolute bottom-4 right-4 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          {localRules.length} characters ingested
        </div>
      </div>
      
      <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-sm">
        <p className="text-[10px] text-zinc-500 font-mono leading-relaxed italic">
          Note: These rules will be used as the primary constraint for the "Internalized Chain of Thought" 
          to verify statute of limitations and procedural compliance across all generated documents.
        </p>
      </div>
    </div>
  );
};
