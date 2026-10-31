import React, { useState, useMemo } from 'react';
import { Search, Book, Clock, AlertTriangle, ChevronRight, Copy, Check, Zap, ShieldAlert } from 'lucide-react';
import manifoldData from '../data/oregonLegalManifold.json';
import { OregonLegalManifold } from '../types';

const manifold = manifoldData as OregonLegalManifold;

export const LegalReference: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(manifold.rules.map(r => r.category));
    return ['all', ...Array.from(cats)];
  }, []);

  const filteredRules = useMemo(() => {
    return manifold.rules.filter(rule => {
      const matchesSearch = 
        rule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.citation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rule.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      
      const matchesCategory = selectedCategory === 'all' || rule.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const handleCopy = (citation: string, id: string) => {
    navigator.clipboard.writeText(citation);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="p-6 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Book className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{manifold.metadata.name}</h2>
            <p className="text-sm text-slate-500">
              {manifold.metadata.jurisdiction} • v{manifold.metadata.version}
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, citation, or notes..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all capitalize"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {filteredRules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <p>No rules found matching your criteria.</p>
          </div>
        ) : (
          filteredRules.map((rule) => (
            <div 
              key={rule.rule_id}
              className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all group shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wider">
                    {rule.source_layer}
                  </span>
                  <span className="text-sm font-mono font-medium text-indigo-600">
                    {rule.citation}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(rule.citation, rule.rule_id)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  title="Copy Citation"
                >
                  {copiedId === rule.rule_id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2">{rule.title}</h3>
              
              {rule.deadline && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">Period</p>
                      <p className="text-sm font-medium text-slate-700">{rule.deadline.period}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">Trigger</p>
                      <p className="text-sm font-medium text-slate-700">{rule.deadline.trigger_event}</p>
                    </div>
                  </div>
                  {rule.deadline.absolute_cap && (
                    <div className="flex items-start gap-2 col-span-full">
                      <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-amber-500 tracking-tight">Absolute Cap</p>
                        <p className="text-sm font-medium text-slate-700">{rule.deadline.absolute_cap}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {rule.notes && (
                <div className="flex items-start gap-2 text-sm text-slate-600 italic">
                  <div className="min-w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5" />
                  <p>{rule.notes}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500 font-medium">
        <div className="flex gap-4">
          {manifold.metadata.sources.map(source => (
            <span key={source}>{source}</span>
          ))}
        </div>
        <span>{filteredRules.length} Rules Loaded</span>
      </div>
    </div>
  );
};
