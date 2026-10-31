import React, { useState, useMemo, useEffect } from 'react';
import { Evidence } from '../types';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  FileText, 
  MessageSquare, 
  MoreVertical, 
  Search, 
  Filter, 
  X, 
  ChevronRight, 
  Info,
  Mail,
  Gavel,
  Tag,
  Zap,
  Edit2,
  ShieldAlert,
  AlertTriangle,
  FileWarning,
  Loader2,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { FileUploader } from './FileUploader';

interface EvidenceManifoldProps {
  evidence: Evidence[];
  onUpdate: (evidence: Evidence[]) => void;
  highlightedEvidenceId: string | null;
  onClearHighlight: () => void;
}

export const EvidenceManifold: React.FC<EvidenceManifoldProps> = ({ evidence, onUpdate, highlightedEvidenceId, onClearHighlight }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [newEvidence, setNewEvidence] = useState<Partial<Evidence>>({
    type: 'exhibit',
    title: '',
    content: '',
    summary: '',
    date: '',
    tags: []
  });

  useEffect(() => {
    if (highlightedEvidenceId) {
      const element = document.getElementById(`evidence-${highlightedEvidenceId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setSelectedEvidence(highlightedEvidenceId);
        onClearHighlight();
      }
    }
  }, [highlightedEvidenceId, onClearHighlight]);

  const startEditing = (item: Evidence, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);
    setNewEvidence({
      type: item.type,
      title: item.title,
      content: item.content,
      summary: item.summary || '',
      date: item.date || '',
      tags: item.tags || []
    });
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addEvidence = (item?: Evidence) => {
    if (item) {
      onUpdate([...evidence, item]);
      return;
    }

    if (!newEvidence.title || !newEvidence.content) return;
    
    if (editingId) {
      const updatedItem: Evidence = {
        ...evidence.find(e => e.id === editingId)!,
        title: newEvidence.title!,
        type: newEvidence.type as any,
        content: newEvidence.content!,
        summary: newEvidence.summary || newEvidence.content?.substring(0, 100) + '...',
        date: newEvidence.date,
        tags: newEvidence.tags || [],
      };
      onUpdate(evidence.map(e => e.id === editingId ? updatedItem : e));
      setEditingId(null);
    } else {
      const newItem: Evidence = {
        id: `EV-${Date.now()}`,
        title: newEvidence.title!,
        type: newEvidence.type as any,
        content: newEvidence.content!,
        summary: newEvidence.summary || newEvidence.content?.substring(0, 100) + '...',
        date: newEvidence.date,
        tags: newEvidence.tags || [],
      };
      onUpdate([...evidence, newItem]);
    }
    
    setNewEvidence({ type: 'exhibit', title: '', content: '', summary: '', date: '', tags: [] });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewEvidence({ type: 'exhibit', title: '', content: '', summary: '', date: '', tags: [] });
    setIsAdding(false);
  };

  const removeEvidence = (id: string) => {
    onUpdate(evidence.filter(e => e.id !== id));
  };

  const generateAISummary = async () => {
    if (!newEvidence.content) return;
    
    setIsGeneratingSummary(true);
    try {
      const response = await fetch("/api/evidence/analyze-legacy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newEvidence.content,
          fileType: "text/plain",
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const metadata = await response.json();
      
      setNewEvidence(prev => ({
        ...prev,
        title: prev.title || metadata.title || '',
        summary: metadata.summary || '',
        date: prev.date || metadata.date || '',
        type: (metadata.category as any) || prev.type || 'exhibit',
        tags: metadata.tags || []
      }));
    } catch (error) {
      console.error("Failed to generate AI analysis:", error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const filteredEvidence = useMemo(() => {
    return evidence.filter(item => {
      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === 'all' || item.type === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [evidence, searchQuery, filterType]);

  const icons = {
    exhibit: <FileText className="w-4 h-4" />,
    transcript: <MessageSquare className="w-4 h-4" />,
    correspondence: <Mail className="w-4 h-4" />,
    pleading: <Gavel className="w-4 h-4" />,
    other: <MoreVertical className="w-4 h-4" />
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-serif italic text-zinc-100">Evidence Manifold</h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">{evidence.length} Items Ingested</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className={cn(
              "px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all flex items-center gap-2",
              isAdding ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 hover:bg-white text-zinc-900"
            )}
          >
            {isAdding ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {isAdding ? "Close Ingest" : "Ingest Evidence"}
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-3.5 h-3.5 text-orange-500" />
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Manual Entry</h3>
            </div>
            <div className="p-6 bg-zinc-900 border border-zinc-800 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="evidence-type" className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Type</label>
                  <select
                    id="evidence-type"
                    value={newEvidence.type}
                    onChange={(e) => setNewEvidence({ ...newEvidence, type: e.target.value as any })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                  >
                    <option value="exhibit">Exhibit</option>
                    <option value="transcript">Transcript</option>
                    <option value="correspondence">Correspondence</option>
                    <option value="pleading">Pleading</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="evidence-date" className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Date (Optional)</label>
                  <input
                    id="evidence-date"
                    type="date"
                    value={newEvidence.date}
                    onChange={(e) => setNewEvidence({ ...newEvidence, date: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="evidence-title" className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Title</label>
                <input
                  id="evidence-title"
                  type="text"
                  placeholder="e.g., Exhibit A: Contract Dated 2023-01-01"
                  value={newEvidence.title}
                  onChange={(e) => setNewEvidence({ ...newEvidence, title: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="evidence-summary" className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Evidence Summary</label>
                  <button
                    onClick={generateAISummary}
                    disabled={isGeneratingSummary || !newEvidence.content}
                    className="flex items-center gap-1 text-[9px] font-mono text-orange-500 hover:text-orange-400 disabled:text-zinc-700 transition-colors uppercase tracking-widest"
                  >
                    {isGeneratingSummary ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    AI Generate
                  </button>
                </div>
                <input
                  id="evidence-summary"
                  type="text"
                  placeholder="e.g., Key facts from the document..."
                  value={newEvidence.summary}
                  onChange={(e) => setNewEvidence({ ...newEvidence, summary: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Categorization Tags Manager */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Auto-Categorization Tags</label>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase">Tags are scanned automatically on file upload or summary generation</span>
                </div>
                
                {/* Visual Active Tags selection */}
                <div className="flex flex-wrap gap-2 p-2 bg-zinc-950 border border-zinc-900 min-h-[36px] items-center rounded-sm">
                  {(!newEvidence.tags || newEvidence.tags.length === 0) ? (
                    <span className="text-[10px] font-mono text-zinc-600 italic pl-1">No tags applied yet. Use presets below or click "AI Generate" above to auto-scan tags.</span>
                  ) : (
                    newEvidence.tags.map(tag => (
                      <span 
                        key={tag}
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded flex items-center gap-1.5 border transition-all",
                          tag === 'PII' ? "bg-red-950/40 text-red-400 border-red-900/30" :
                          tag === 'Financial' ? "bg-green-950/40 text-green-400 border-green-900/30" :
                          tag === 'Contract' ? "bg-blue-950/40 text-blue-400 border-blue-900/30" :
                          tag === 'Correspondence' ? "bg-yellow-950/40 text-yellow-400 border-yellow-900/30" :
                          "bg-zinc-855 text-zinc-300 border-zinc-800"
                        )}
                      >
                        {tag}
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            const updatedTags = (newEvidence.tags || []).filter(t => t !== tag);
                            setNewEvidence({ ...newEvidence, tags: updatedTags });
                          }}
                          className="hover:text-white text-zinc-500 focus:outline-none focus:text-white transition-colors cursor-pointer"
                          title="Remove Tag"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Preset Suggestions & Custom input */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pt-1">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[9px] font-mono text-zinc-600 uppercase mr-1">Presets:</span>
                    {['PII', 'Financial', 'Contract', 'Correspondence'].map(preset => {
                      const hasTag = (newEvidence.tags || []).includes(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            const current = newEvidence.tags || [];
                            const updated = hasTag ? current.filter(t => t !== preset) : [...current, preset];
                            setNewEvidence({ ...newEvidence, tags: updated });
                          }}
                          className={cn(
                            "px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider rounded-sm border transition-all cursor-pointer",
                            hasTag 
                              ? preset === 'PII' ? "bg-red-955 text-red-400 border-red-900" :
                                preset === 'Financial' ? "bg-green-955 text-green-400 border-green-900" :
                                preset === 'Contract' ? "bg-blue-955 text-blue-400 border-blue-900" :
                                "bg-yellow-955 text-yellow-400 border-yellow-900"
                              : "bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700"
                          )}
                        >
                          {hasTag ? `✓ ${preset}` : preset}
                        </button>
                      );
                    })}
                  </div>

                  {/* Add manual tag input */}
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <input
                      id="custom-tag-input"
                      type="text"
                      placeholder="Add manual tag..."
                      className="bg-zinc-950 border border-zinc-800 text-zinc-300 px-2 py-1 text-[10px] font-mono uppercase tracking-wider focus:outline-none focus:border-orange-500 w-full sm:w-28"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = e.currentTarget.value.trim();
                          if (val) {
                            const current = newEvidence.tags || [];
                            if (!current.includes(val)) {
                              setNewEvidence({ ...newEvidence, tags: [...current, val] });
                            }
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        const input = document.getElementById('custom-tag-input') as HTMLInputElement;
                        if (input && input.value.trim()) {
                          const val = input.value.trim();
                          const current = newEvidence.tags || [];
                          if (!current.includes(val)) {
                            setNewEvidence({ ...newEvidence, tags: [...current, val] });
                          }
                          input.value = '';
                        }
                      }}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 border border-zinc-800 font-mono text-[9px] uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="evidence-content" className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Full Content / Transcription</label>
                <textarea
                  id="evidence-content"
                  rows={3}
                  maxLength={15000}
                  placeholder="Describe the content or key facts..."
                  value={newEvidence.content}
                  onChange={(e) => setNewEvidence({ ...newEvidence, content: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 px-3 py-2 text-xs focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                {editingId && (
                  <button
                    onClick={cancelEdit}
                    className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px] uppercase tracking-widest transition-all"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  onClick={() => addEvidence()}
                  className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-mono text-[10px] uppercase tracking-widest transition-all"
                >
                  {editingId ? "Update Evidence" : "Commit to Manifold"}
                </button>
              </div>
            </div>
          </div>

          {!editingId && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-orange-500" />
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">AI-Powered File Ingest</h3>
              </div>
              <FileUploader onEvidenceAdded={addEvidence} />
            </div>
          )}
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-zinc-900/50 p-4 border border-zinc-800">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            type="text"
            placeholder="Search evidence manifold..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-orange-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-zinc-600" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-400 px-3 py-2 text-[10px] font-mono uppercase tracking-widest focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Types</option>
            <option value="exhibit">Exhibits</option>
            <option value="transcript">Transcripts</option>
            <option value="correspondence">Correspondence</option>
            <option value="pleading">Pleadings</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Evidence List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredEvidence.map((item) => (
          <div
            key={item.id}
            id={`evidence-${item.id}`}
            onClick={() => setSelectedEvidence(selectedEvidence === item.id ? null : item.id)}
            className={cn(
              "group bg-zinc-900 border transition-all cursor-pointer",
              selectedEvidence === item.id || highlightedEvidenceId === item.id ? "border-orange-600 ring-1 ring-orange-600/20" : "border-zinc-800 hover:border-zinc-600"
            )}
          >
            <div className="p-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className={cn(
                  "p-2 rounded-sm bg-zinc-950 border border-zinc-800 text-orange-500",
                  selectedEvidence === item.id && "bg-orange-600/10 border-orange-600/30"
                )}>
                  {icons[item.type as keyof typeof icons] || icons.other}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-medium text-zinc-200">{item.title}</h3>
                    {item.fileName && (
                      <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest bg-zinc-950 px-1.5 py-0.5 border border-zinc-800">
                        {item.fileName} ({item.fileSize})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 line-clamp-1 italic">
                    {item.summary || item.content}
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                      <Tag className="w-3 h-3" />
                      {item.type}
                    </div>
                    {item.date && (
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                        <Calendar className="w-3 h-3" />
                        {item.date}
                      </div>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        {item.tags.map(tag => (
                          <span 
                            key={tag} 
                            className={cn(
                              "text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border leading-none",
                              tag === 'PII' ? "bg-red-950/20 text-red-400 border-red-900/30" :
                              tag === 'Financial' ? "bg-green-950/20 text-green-400 border-green-900/30" :
                              tag === 'Contract' ? "bg-blue-950/20 text-blue-400 border-blue-900/30" :
                              tag === 'Correspondence' ? "bg-yellow-950/20 text-yellow-400 border-yellow-900/30" :
                              "bg-zinc-800 text-zinc-400 border-zinc-705"
                            )}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.findings && item.findings.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-red-500 uppercase tracking-widest bg-red-900/10 px-1.5 py-0.5 border border-red-900/20 rounded-sm">
                        <ShieldAlert className="w-3 h-3" />
                        {item.findings.length} Findings
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => startEditing(item, e)}
                  className="p-2 text-zinc-700 hover:text-orange-500 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeEvidence(item.id);
                  }}
                  className="p-2 text-zinc-700 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className={cn(
                  "w-4 h-4 text-zinc-700 transition-transform duration-300",
                  selectedEvidence === item.id && "rotate-90 text-orange-500"
                )} />
              </div>
            </div>

            {selectedEvidence === item.id && (
              <div className="px-4 pb-6 pt-2 border-t border-zinc-800/50 animate-in slide-in-from-top-2 duration-300">
                <div className="bg-zinc-950 p-6 border border-zinc-800 space-y-6">
                  {item.tags && item.tags.length > 0 && (
                    <div className="space-y-2 pb-4 border-b border-zinc-900">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3 h-3 text-orange-500" />
                        <p className="text-[9px] font-mono uppercase tracking-widest text-orange-500">Auto-Categorization Metadata Tags</p>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {item.tags.map(tag => (
                          <span 
                            key={tag} 
                            className={cn(
                              "px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border transition-all",
                              tag === 'PII' ? "bg-red-955 text-red-400 border-red-900" :
                              tag === 'Financial' ? "bg-green-955 text-green-400 border-green-900" :
                              tag === 'Contract' ? "bg-blue-955 text-blue-400 border-blue-900" :
                              tag === 'Correspondence' ? "bg-yellow-955 text-yellow-400 border-yellow-900" :
                              "bg-zinc-900 text-zinc-300 border-zinc-800"
                            )}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Info className="w-3 h-3 text-orange-500" />
                      <p className="text-[9px] font-mono uppercase tracking-widest text-orange-500">Document Summary</p>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed italic">
                      {item.summary || "No summary available for this item."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3 text-zinc-500" />
                      <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Content Preview</p>
                    </div>
                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-sm">
                      <p className="text-[11px] text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap">
                        {item.content.length > 200 ? item.content.substring(0, 200) + '...' : item.content}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3 text-zinc-500" />
                      <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Full Content / Transcription</p>
                    </div>
                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-sm">
                      <p className="text-[11px] text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </div>
                  </div>

                  {item.findings && item.findings.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                        <p className="text-[10px] font-mono uppercase tracking-widest text-red-500">Unauthorized Info & Discrepancy Report</p>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {item.findings.map((finding) => (
                          <div key={finding.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-sm space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-1.5 py-0.5 text-[8px] font-mono uppercase rounded-sm",
                                  finding.type === 'unauthorized_info' ? "bg-red-900/40 text-red-400" :
                                  finding.type === 'violation' ? "bg-orange-900/40 text-orange-400" :
                                  "bg-blue-900/40 text-blue-400"
                                )}>
                                  {finding.findingType || finding.type?.replace('_', ' ')}
                                </span>
                                <span className={cn(
                                  "text-[8px] font-mono uppercase",
                                  finding.severity === 'CRITICAL' || finding.severity === 'High' ? "text-red-500 font-bold" :
                                  finding.severity === 'HIGH' || finding.severity === 'Medium' ? "text-orange-500" :
                                  "text-zinc-500"
                                )}>
                                  {finding.severity} Severity
                                </span>
                                {finding.status && (
                                  <span className={cn(
                                    "text-[8px] font-mono uppercase",
                                    finding.status === 'Unresolved' ? "text-red-400" :
                                    finding.status === 'Flagged' ? "text-orange-400" :
                                    "text-green-400"
                                  )}>
                                    [{finding.status}]
                                  </span>
                                )}
                              </div>
                              {finding.location && (
                                <span className="text-[8px] font-mono text-zinc-600 uppercase">{finding.location}</span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-300 leading-relaxed">{finding.description}</p>
                            {finding.violationType && (
                              <div className="flex items-start gap-2 pt-1">
                                <FileWarning className="w-3 h-3 text-zinc-600 mt-0.5" />
                                <p className="text-[9px] font-mono text-zinc-500 italic">Violation: {finding.violationType}</p>
                              </div>
                            )}
                            {finding.suggestedAction && (
                              <div className="flex items-start gap-2 pt-1 border-t border-zinc-800 mt-2">
                                <Info className="w-3 h-3 text-blue-500 mt-0.5" />
                                <p className="text-[9px] font-mono text-blue-400">Suggested Action: {finding.suggestedAction}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredEvidence.length === 0 && (
          <div className="py-20 border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-700 space-y-4">
            <div className="relative">
              <FileText className="w-12 h-12 opacity-10" />
              <Search className="w-6 h-6 absolute -bottom-1 -right-1 opacity-20" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-widest">No matching evidence found</p>
              <p className="text-[9px] font-mono text-zinc-800 uppercase tracking-widest">Try adjusting your search or filters</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
