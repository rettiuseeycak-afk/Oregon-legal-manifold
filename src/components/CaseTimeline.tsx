import React, { useState, useMemo } from 'react';
import { Case } from '../types';
import { Clock, AlertCircle, Calendar, FileText, Loader2, ShieldAlert, Activity, FileDown } from 'lucide-react';
import { generateContentProxy } from '../lib/geminiClient';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { CaseBackupModal } from './CaseBackupModal';
import { downloadCaseBackupJson } from '../utils/caseBackup';

interface CaseTimelineProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
}

export const CaseTimeline: React.FC<CaseTimelineProps> = ({ activeCase, onUpdateCase }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [solAnalysis, setSolAnalysis] = useState<string | null>(activeCase.timelineAnalysis || null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Extract and sort events
  const events = useMemo(() => {
    const evs = activeCase.evidence
      .filter(e => e.date)
      .map(e => {
        let parsedDate = new Date(e.date!);
        if (isNaN(parsedDate.getTime())) {
          // Fallback if date is not perfectly formatted
          parsedDate = new Date(); 
        }
        return {
          id: e.id,
          date: parsedDate,
          dateString: e.date,
          title: e.title,
          type: e.type,
          summary: e.summary,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return evs;
  }, [activeCase.evidence]);

  const analyzeTimeline = async () => {
    setIsAnalyzing(true);
    
    const prompt = `
      Analyze the following timeline of events for a legal case in ${activeCase.jurisdiction || 'Oregon'}.
      
      CASE NAME: ${activeCase.name}
      CLAIMS: ${activeCase.claims.map(c => c.title).join(', ')}
      
      TIMELINE OF EVENTS:
      ${events.map(e => `- ${e.dateString}: ${e.title} (${e.type}) - ${e.summary || ''}`).join('\n')}
      
      TASK:
      1. Identify the likely causes of action based on the claims and events.
      2. Determine the applicable Statute of Limitations (SOL) for these claims in ${activeCase.jurisdiction || 'Oregon'}.
      3. Highlight any potential SOL issues (e.g., claims that might be time-barred).
      4. Note any critical missing dates or gaps in the timeline that need investigation.
      
      Format the output in clear Markdown. Use bolding for critical dates and warnings.
    `;

    try {
      const response = await generateContentProxy({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });
      
      const analysis = response.text || "No analysis generated.";
      setSolAnalysis(analysis);
      
      onUpdateCase({
        ...activeCase,
        timelineAnalysis: analysis
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-indigo-500" />
          <h2 className="text-xl font-serif italic text-zinc-100">Case Timeline & SOL Analysis</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBackupModalOpen(true)}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-mono text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer rounded-sm"
            title="Export complete case backup with timeline, evidence, and claims as structured JSON"
          >
            <FileDown className="w-3.5 h-3.5 text-orange-500" />
            <span>Export Backup (JSON)</span>
          </button>
          <button
            onClick={analyzeTimeline}
            disabled={isAnalyzing || events.length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-mono text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer rounded-sm"
          >
            {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            Analyze Statute of Limitations
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Timeline Visualization */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-sm">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-300">Chronological Event Record</span>
          </div>

          {events.length === 0 ? (
            <div className="p-12 border border-dashed border-zinc-800 rounded-sm flex flex-col items-center justify-center text-zinc-600 space-y-4">
              <Calendar className="w-8 h-8 opacity-20" />
              <p className="text-[10px] font-mono uppercase tracking-widest text-center">
                No dated evidence found.<br/>
                Add dates to evidence items to build the timeline.
              </p>
            </div>
          ) : (
            <div className="relative border-l border-zinc-800 ml-4 space-y-8 pb-8">
              {events.map((event, index) => (
                <div key={event.id} className="relative pl-8">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-zinc-950" />
                  
                  <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-sm hover:border-zinc-700 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-xs font-mono text-indigo-300 font-bold">{event.dateString}</span>
                      </div>
                      <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-sm">
                        {event.type}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-zinc-200 mb-1">{event.title}</h4>
                    {event.summary && (
                      <p className="text-xs text-zinc-500 leading-relaxed">{event.summary}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SOL Analysis Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-sm">
            <ShieldAlert className="w-4 h-4 text-orange-500" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-300">Statute of Limitations Risk</span>
          </div>

          {solAnalysis ? (
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm prose prose-invert prose-zinc max-w-none prose-sm">
              <ReactMarkdown>{solAnalysis}</ReactMarkdown>
            </div>
          ) : (
            <div className="p-12 border border-dashed border-zinc-800 rounded-sm flex flex-col items-center justify-center text-zinc-600 space-y-4">
              <AlertCircle className="w-8 h-8 opacity-20" />
              <p className="text-[10px] font-mono uppercase tracking-widest text-center">
                Run analysis to detect<br/>time-barred claims
              </p>
            </div>
          )}
        </div>
      </div>

      <CaseBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        activeCase={activeCase}
      />
    </div>
  );
};
