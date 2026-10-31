import React, { useState } from 'react';
import { generateContentProxy } from '../lib/geminiClient';
import { Search, Loader2, Copy, Check, ExternalLink, Plus, Book } from 'lucide-react';
import { cn } from '../lib/utils';
import manifoldData from '../data/oregonLegalManifold.json';
import { OregonLegalManifold } from '../types';

const manifold = manifoldData as OregonLegalManifold;

interface Citation {
  title: string;
  snippet: string;
  url: string;
  isLocal?: boolean;
}

interface CitationSearchProps {
  onSelect?: (citation: Citation) => void;
}

export const CitationSearch: React.FC<CitationSearchProps> = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Citation[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setError(null);
    
    // Search manifold (Local)
    const manifoldResults: Citation[] = manifold.rules
      .filter(rule => 
        rule.title.toLowerCase().includes(query.toLowerCase()) || 
        rule.citation.toLowerCase().includes(query.toLowerCase()) ||
        (rule.notes?.toLowerCase().includes(query.toLowerCase()) ?? false)
      )
      .map(rule => ({
        title: `${rule.citation}: ${rule.title}`,
        snippet: rule.notes || `Source: ${rule.source_layer}. Type: ${rule.rule_type}.`,
        url: rule.source_layer === 'ORS' 
          ? `https://www.oregonlegislature.gov/bills_laws/ors/ors${rule.citation.match(/\d+/)?.[0].padStart(3, '0') || ''}.html`
          : 'https://www.courts.oregon.gov/rules/Pages/default.aspx',
        isLocal: true
      }));

    setResults(manifoldResults);
    
    try {
      const response = await generateContentProxy({
        model: "gemini-3.5-flash",
        contents: `Search for official legal citations, statutes, or case law related to: ${query}. 
          For Oregon-specific legal questions, prioritize the official Oregon Revised Statutes (ORS) at https://www.oregonlegislature.gov/bills_laws/Pages/ORS.aspx. 
          Provide a list of citations with their titles, brief snippets, and source URLs.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              citations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    snippet: { type: "string" },
                    url: { type: "string" }
                  },
                  required: ["title", "snippet", "url"]
                }
              }
            },
            required: ["citations"]
          }
        },
      });

      const data = JSON.parse(response.text || '{"citations": []}');
      setResults(prev => [...prev, ...data.citations]);
    } catch (err: any) {
      if (manifoldResults.length === 0) {
        setError(err.message || "Failed to search citations.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Legal Citation Search</span>
        </div>
        <div className="flex gap-2">
          <label htmlFor="citation-search" className="sr-only">Search citations</label>
          <input
            id="citation-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search statutes, case law, or topics..."
            className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-200 px-3 py-1.5 text-xs focus:outline-none focus:border-orange-500"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 text-zinc-300 transition-colors"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="text-[10px] font-mono text-red-500 bg-red-900/10 p-2 border border-red-900/30">
            {error}
          </div>
        )}

        {results.map((citation, index) => (
          <div key={index} className="p-3 bg-zinc-950 border border-zinc-800 rounded-sm space-y-2 group">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                {citation.isLocal && (
                  <div className="flex items-center gap-1 text-[8px] font-bold text-indigo-400 uppercase tracking-widest">
                    <Book className="w-2 h-2" />
                    <span>Local Manifold</span>
                  </div>
                )}
                <h4 className="text-[11px] font-bold text-zinc-200 leading-tight">{citation.title}</h4>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => copyToClipboard(`${citation.title}: ${citation.snippet}`, index)}
                  className="p-1 hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-all"
                  title="Copy Citation"
                >
                  {copiedIndex === index ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </button>
                {onSelect && (
                  <button
                    onClick={() => onSelect(citation)}
                    className="p-1 hover:bg-zinc-800 text-zinc-600 hover:text-orange-500 transition-all"
                    title="Insert into Document"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-zinc-800 text-zinc-600 hover:text-orange-500 transition-all"
                  title="View Source"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono leading-relaxed italic line-clamp-3">
              {citation.snippet}
            </p>
          </div>
        ))}

        {!isSearching && results.length === 0 && !error && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-700 space-y-2 py-8">
            <Search className="w-6 h-6 opacity-10" />
            <p className="text-[9px] font-mono uppercase tracking-tighter">Enter query to find citations</p>
          </div>
        )}
      </div>
    </div>
  );
};
