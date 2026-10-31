import React, { useState, useMemo } from 'react';
import { LegalClaim, Evidence } from '../types';
import { Plus, Trash2, Link as LinkIcon, AlertCircle, Search, Info, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ClaimsEditorProps {
  claims: LegalClaim[];
  evidence: Evidence[];
  onUpdate: (claims: LegalClaim[]) => void;
  onNavigateToEvidence: (id: string) => void;
}

export const ClaimsEditor: React.FC<ClaimsEditorProps> = ({ claims, evidence, onUpdate, onNavigateToEvidence }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [evidenceSearch, setEvidenceSearch] = useState('');
  const [previewEvidenceId, setPreviewEvidenceId] = useState<string | null>(null);
  const [newClaim, setNewClaim] = useState<Partial<LegalClaim>>({
    title: '',
    description: '',
    evidenceIds: []
  });

  const addClaim = () => {
    if (!newClaim.title || !newClaim.description) return;
    
    const item: LegalClaim = {
      id: `CL-${Date.now()}`,
      title: newClaim.title!,
      description: newClaim.description!,
      evidenceIds: newClaim.evidenceIds || []
    };
    
    onUpdate([...claims, item]);
    setNewClaim({ title: '', description: '', evidenceIds: [] });
    setIsAdding(false);
  };

  const removeClaim = (id: string) => {
    onUpdate(claims.filter(c => c.id !== id));
  };

  const toggleEvidenceForNew = (id: string) => {
    const current = newClaim.evidenceIds || [];
    if (current.includes(id)) {
      setNewClaim({ ...newClaim, evidenceIds: current.filter(eid => eid !== id) });
    } else {
      setNewClaim({ ...newClaim, evidenceIds: [...current, id] });
    }
  };

  const toggleEvidenceForExisting = (claimId: string, evidenceId: string) => {
    const updatedClaims = claims.map(c => {
      if (c.id === claimId) {
        const evidenceIds = c.evidenceIds.includes(evidenceId)
          ? c.evidenceIds.filter(id => id !== evidenceId)
          : [...c.evidenceIds, evidenceId];
        return { ...c, evidenceIds };
      }
      return c;
    });
    onUpdate(updatedClaims);
  };

  const filteredEvidence = useMemo(() => {
    return evidence.filter(e => 
      e.title.toLowerCase().includes(evidenceSearch.toLowerCase()) ||
      e.id.toLowerCase().includes(evidenceSearch.toLowerCase()) ||
      (e.summary && e.summary.toLowerCase().includes(evidenceSearch.toLowerCase()))
    );
  }, [evidence, evidenceSearch]);

  const EvidenceLinker = ({ 
    selectedIds, 
    onToggle, 
    title = "Link Evidence Blocks" 
  }: { 
    selectedIds: string[], 
    onToggle: (id: string) => void,
    title?: string
  }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{title}</label>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
          <input 
            type="text"
            placeholder="Search evidence..."
            value={evidenceSearch}
            onChange={(e) => setEvidenceSearch(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-300 pl-7 pr-2 py-1 text-[10px] font-mono focus:outline-none focus:border-orange-500 w-40"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 bg-zinc-950 border border-zinc-800 scrollbar-thin scrollbar-thumb-zinc-800">
        {filteredEvidence.map(e => (
          <div key={e.id} className="relative group/item">
            <button
              onClick={() => onToggle(e.id)}
              className={cn(
                "w-full text-left px-3 py-2 text-[10px] font-mono border transition-all flex flex-col gap-1",
                selectedIds.includes(e.id)
                  ? 'bg-orange-900/20 border-orange-500 text-orange-200'
                  : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-bold flex-1">{e.title}</span>
                {selectedIds.includes(e.id) && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />}
              </div>
              <div className="flex items-center justify-between text-[8px] opacity-50">
                <span>{e.id}</span>
                <span className="uppercase">{e.type}</span>
              </div>
            </button>
            <button 
              onClick={(ev) => {
                ev.stopPropagation();
                setPreviewEvidenceId(previewEvidenceId === e.id ? null : e.id);
              }}
              className="absolute right-1 top-1 p-1 text-zinc-700 hover:text-zinc-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
            >
              <Info className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {previewEvidenceId === e.id && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute z-10 left-0 right-0 top-full mt-1 p-3 bg-zinc-900 border border-zinc-700 shadow-xl text-[10px] text-zinc-300 italic leading-relaxed"
                >
                  <div className="flex items-center justify-between mb-1 border-b border-zinc-800 pb-1">
                    <span className="font-mono uppercase text-zinc-500 text-[8px]">Preview</span>
                    <X className="w-2 h-2 cursor-pointer" onClick={() => setPreviewEvidenceId(null)} />
                  </div>
                  {e.summary || e.content.substring(0, 150) + "..."}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
        {filteredEvidence.length === 0 && (
          <div className="col-span-2 text-center py-8 text-zinc-700 text-[10px] uppercase font-mono border border-dashed border-zinc-900">
            {evidence.length === 0 ? "No evidence available" : "No matches found"}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <h2 className="text-xl font-serif italic text-zinc-100">Legal Claims & Theory</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-900 font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2"
        >
          <Plus className="w-3 h-3" />
          Formulate Claim
        </button>
      </div>

      {isAdding && (
        <div className="p-6 bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Claim Title</label>
            <input
              type="text"
              placeholder="e.g., Breach of Fiduciary Duty"
              value={newClaim.title}
              onChange={(e) => setNewClaim({ ...newClaim, title: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Legal Basis / Description</label>
            <textarea
              rows={3}
              placeholder="Describe the legal theory and factual basis..."
              value={newClaim.description}
              onChange={(e) => setNewClaim({ ...newClaim, description: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 px-3 py-2 text-xs focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>
          
          <EvidenceLinker 
            selectedIds={newClaim.evidenceIds || []} 
            onToggle={toggleEvidenceForNew} 
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-1.5 text-zinc-500 hover:text-zinc-300 font-mono text-[10px] uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              onClick={addClaim}
              className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-mono text-[10px] uppercase tracking-widest"
            >
              Map to Manifold
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {claims.map((claim) => (
          <div
            key={claim.id}
            className="group p-6 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif italic text-zinc-100">{claim.title}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingClaimId(editingClaimId === claim.id ? null : claim.id)}
                  className={`p-1 transition-all ${editingClaimId === claim.id ? 'text-orange-500' : 'text-zinc-600 hover:text-zinc-300'}`}
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeClaim(claim.id)}
                  className="p-1 text-zinc-600 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">{claim.description}</p>
            
            <AnimatePresence>
              {editingClaimId === claim.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mb-6 p-4 bg-zinc-950 border border-zinc-800 space-y-3">
                    <div className="flex justify-end">
                      <button 
                        onClick={() => setEditingClaimId(null)} 
                        className="text-[9px] font-mono text-zinc-600 hover:text-zinc-400 uppercase tracking-widest flex items-center gap-1"
                      >
                        <X className="w-2 h-2" /> Close Editor
                      </button>
                    </div>
                    <EvidenceLinker 
                      selectedIds={claim.evidenceIds} 
                      onToggle={(eid) => toggleEvidenceForExisting(claim.id, eid)}
                      title={`Linking Evidence for: ${claim.title}`}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap gap-2">
              {claim.evidenceIds.map(eid => {
                const e = evidence.find(item => item.id === eid);
                return (
                  <button
                    key={eid}
                    onClick={() => onNavigateToEvidence(eid)}
                    className="flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-500 hover:text-orange-500 hover:border-orange-500 transition-all"
                  >
                    <LinkIcon className="w-3 h-3 text-orange-500" />
                    {e?.title || eid}
                  </button>
                );
              })}
              {claim.evidenceIds.length === 0 && (
                <div className="flex items-center gap-2 text-[10px] font-mono text-red-500/50 italic">
                  <AlertCircle className="w-3 h-3" />
                  No evidence mapped
                </div>
              )}
            </div>
          </div>
        ))}
        {claims.length === 0 && !isAdding && (
          <div className="py-12 border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-600 space-y-2">
            <Plus className="w-8 h-8 opacity-20" />
            <span className="text-[10px] font-mono uppercase tracking-widest">No claims formulated</span>
          </div>
        )}
      </div>
    </div>
  );
};
