import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Database, 
  Zap, 
  Clock, 
  FileText, 
  ShieldCheck, 
  Code, 
  CheckCircle2, 
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Case } from '../types';
import { 
  generateStructuredCaseBackup, 
  downloadCaseBackupJson, 
  getStructuredCaseBackupJsonString,
  StructuredCaseBackup 
} from '../utils/caseBackup';

interface CaseBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCase: Case;
}

export const CaseBackupModal: React.FC<CaseBackupModalProps> = ({
  isOpen,
  onClose,
  activeCase
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'json'>('overview');
  const [isCopied, setIsCopied] = useState(false);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  const backupData: StructuredCaseBackup = useMemo(() => {
    return generateStructuredCaseBackup(activeCase);
  }, [activeCase]);

  const jsonString = useMemo(() => {
    return getStructuredCaseBackupJsonString(activeCase, 2);
  }, [activeCase]);

  if (!isOpen) return null;

  const handleDownload = () => {
    try {
      const result = downloadCaseBackupJson(activeCase);
      setDownloadSuccessMessage(`Successfully exported ${result.fileName} (${result.sizeFormatted})`);
      setTimeout(() => setDownloadSuccessMessage(null), 5000);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy JSON:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
      />

      {/* Modal Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.35 }}
        className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <header className="p-5 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <Download className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-mono uppercase tracking-wider font-bold text-zinc-100">
                  Export Case Data Backup
                </h3>
                <span className="text-[9px] font-mono text-amber-400 font-bold py-0.5 px-2 bg-amber-950/40 rounded border border-amber-800/40">
                  JSON v{backupData.backupVersion}
                </span>
                <span className="text-[9px] font-mono text-zinc-400 py-0.5 px-2 bg-zinc-900 rounded border border-zinc-800">
                  Full Schema
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Download structured backup of case manifold: <span className="text-zinc-200 font-medium">"{activeCase.name}"</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* View Switcher Tabs */}
        <div className="px-6 pt-3 border-b border-zinc-850 bg-zinc-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 px-3 text-xs font-mono uppercase tracking-wider font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Backup Contents & Structure
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`pb-3 px-3 text-xs font-mono uppercase tracking-wider font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'json'
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              JSON Data Preview
            </button>
          </div>

          <div className="text-[10px] font-mono text-zinc-500 pb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <span>Ready for offline archival & restore</span>
          </div>
        </div>

        {/* Success toast banner if download triggered */}
        {downloadSuccessMessage && (
          <div className="bg-green-950/40 border-b border-green-850 px-6 py-2.5 flex items-center justify-between text-xs font-mono text-green-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              {downloadSuccessMessage}
            </span>
            <span className="text-[10px] text-green-500 uppercase">Saved to Downloads</span>
          </div>
        )}

        {/* Scrollable Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'overview' ? (
            <div className="space-y-6">
              {/* Metric stats card grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-zinc-900/60 border border-zinc-850 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-[9px] font-mono uppercase tracking-wider font-bold">Evidence Exhibits</span>
                    <Database className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="text-2xl font-serif font-bold text-zinc-100">
                    {backupData.summaryStatistics.totalEvidenceCount}
                  </div>
                  <p className="text-[10px] font-mono text-zinc-400">
                    Exhibits, transcripts, notes, tags & bodies
                  </p>
                </div>

                <div className="p-4 bg-zinc-900/60 border border-zinc-850 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-[9px] font-mono uppercase tracking-wider font-bold">Pleadable Claims</span>
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-serif font-bold text-zinc-100">
                    {backupData.summaryStatistics.totalClaimsCount}
                  </div>
                  <p className="text-[10px] font-mono text-zinc-400">
                    Causes of action, ORS citations & proofs
                  </p>
                </div>

                <div className="p-4 bg-zinc-900/60 border border-zinc-850 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-[9px] font-mono uppercase tracking-wider font-bold">Chronological Timeline</span>
                    <Clock className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-2xl font-serif font-bold text-zinc-100">
                    {backupData.summaryStatistics.totalTimelineEventsCount}
                  </div>
                  <p className="text-[10px] font-mono text-zinc-400">
                    Chronologically mapped sequence points
                  </p>
                </div>
              </div>

              {/* Data Sections Included In The Backup */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-400" />
                  Included In Structured Backup Payload
                </h4>

                <div className="bg-zinc-900/40 border border-zinc-850 rounded-lg divide-y divide-zinc-850/80">
                  {/* Evidence Section */}
                  <div className="p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-zinc-200">1. Evidence Manifold (`evidence`)</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-950/60 border border-orange-800/50 text-orange-300">
                          {backupData.evidence.length} Items
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Contains all uploaded documents, exhibits, transcripts, contracts, and correspondence with full text contents, metadata tags, exhibit classifications, and timestamps.
                      </p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-1" />
                  </div>

                  {/* Claims Section */}
                  <div className="p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-zinc-200">2. Legal Claims Matrix (`claims`)</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/50 text-amber-300">
                          {backupData.claims.length} Claims
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        All claims pleaded in this case, legal grounds, ORS statutory citations, cross-referenced exhibit IDs, cause of action accrual dates, and limitations years.
                      </p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-1" />
                  </div>

                  {/* Timeline Section */}
                  <div className="p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-zinc-200">3. Chronology Sequence Plot (`timeline`)</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-950/60 border border-sky-800/50 text-sky-300">
                          {backupData.timeline.length} Sequenced Events
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Chronologically sequenced event timeline spanning from{' '}
                        <span className="text-zinc-200 font-mono">{backupData.summaryStatistics.earliestTimelineDate || 'N/A'}</span> to{' '}
                        <span className="text-zinc-200 font-mono">{backupData.summaryStatistics.latestTimelineDate || 'N/A'}</span>.
                        Each event includes its sequence number, exhibit source ID, verified date, and associated claim cross-links.
                      </p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-1" />
                  </div>

                  {/* Case Envelope & Metadata */}
                  <div className="p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-zinc-200">4. Case Metadata & Analysis (`caseMetadata`, `executiveSummary`)</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          Full Envelope
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Case ID, jurisdiction venue ({activeCase.jurisdiction || 'Oregon Circuit Court'}), court rules reference, practitioner notes, and Gemini executive briefing text.
                      </p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-1" />
                  </div>
                </div>
              </div>

              {/* Sample Timeline Preview Snippet */}
              {backupData.timeline.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                    <span className="uppercase font-bold tracking-wider">Chronological Sequence Sample</span>
                    <span>Displaying first {Math.min(3, backupData.timeline.length)} of {backupData.timeline.length} events</span>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    {backupData.timeline.slice(0, 3).map((item) => (
                      <div key={item.sequenceIndex} className="p-3 bg-zinc-900/40 border border-zinc-850 rounded flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 text-[10px] font-bold rounded">
                            #{item.sequenceIndex}
                          </span>
                          <span className="text-amber-400 text-[11px] font-bold">
                            {item.date}
                          </span>
                          <span className="text-zinc-200 truncate max-w-md">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[10px] uppercase text-zinc-500 tracking-wider">
                          {item.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Structured JSON Envelope ({jsonString.length.toLocaleString()} characters)</span>
                <span className="text-zinc-500">2-space formatted indentation</span>
              </div>
              <pre className="p-4 bg-zinc-950 border border-zinc-850 rounded-lg text-zinc-300 font-mono text-[11px] leading-relaxed max-h-[460px] overflow-x-auto overflow-y-auto selection:bg-orange-950 selection:text-orange-200">
                {jsonString}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="p-5 border-t border-zinc-850 bg-zinc-900/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>Export generated on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-none py-2 px-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-mono text-xs uppercase tracking-wider font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-none py-2 px-5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-mono text-xs uppercase tracking-wider font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-950/30"
            >
              <Download className="w-4 h-4" />
              <span>Download Backup (.json)</span>
            </button>
          </div>
        </footer>
      </motion.div>
    </div>
  );
};
