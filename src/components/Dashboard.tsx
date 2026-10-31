import React, { useState, useEffect } from 'react';
import { Case, Evidence, LegalClaim, SUBSCRIPTION_PLANS, SubscriptionPlanId } from '../types';
import { 
  Database, 
  Gavel, 
  Zap, 
  FileText, 
  ShieldAlert, 
  Activity, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Scale,
  Copy,
  Check,
  Plus,
  Loader2,
  Calendar,
  Settings,
  Sparkles,
  RefreshCw,
  FileSignature,
  Workflow,
  Cpu,
  CornerDownRight,
  Send,
  Sliders,
  LogOut,
  ChevronRight,
  Search,
  BookOpen,
  X,
  FileDown,
  Trash2,
  FileCode,
  Wallet,
  ExternalLink,
  Share2,
  Maximize2,
  ChevronDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { generateContentProxy } from '../lib/geminiClient';
import ReactMarkdown from 'react-markdown';
import { LimitationsAudit } from './LimitationsAudit';
import { evaluateAllCaseLimitations } from '../lib/statuteOfLimitationsService';
import { CaseBackupModal } from './CaseBackupModal';
import { downloadCaseBackupJson } from '../utils/caseBackup';

interface DashboardProps {
  activeCase: Case;
  onTabChange: (tab: string) => void;
  onUpdateCase: (updatedCase: Case) => void;
  userPlan?: SubscriptionPlanId | string;
  onPlanChanged?: (newPlan: SubscriptionPlanId) => void;
  userId?: string;
  user?: {
    id?: string;
    email?: string;
    plan: string;
    usage?: Record<string, any>;
    [key: string]: any;
  };
}

export interface BillingDashboardProps {
  user: {
    plan: string;
    usage?: Record<string, any>;
    [key: string]: any;
  };
  openBillingModal?: () => void;
}

export function BillingDashboard({ user, openBillingModal: externalOpenModal }: BillingDashboardProps) {
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const plan = SUBSCRIPTION_PLANS[(user?.plan as SubscriptionPlanId)] || SUBSCRIPTION_PLANS.free;

  const openBillingModal = () => {
    if (externalOpenModal) {
      externalOpenModal();
    } else {
      setInternalModalOpen(true);
    }
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-850 rounded-xl p-6 shadow-xl space-y-4 text-zinc-200">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Billing Overview</h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">Account plan tier and resource allocations</p>
        </div>
        <button
          onClick={() => openBillingModal()}
          className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono uppercase tracking-wider font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-orange-600/20"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-200" />
          Change Plan
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-mono text-zinc-300">
          Current Plan: <span className="font-bold text-orange-400">{plan.name}</span>
        </p>
        <p className="text-sm font-mono text-zinc-300">
          Price: <span className="font-bold text-zinc-100">${plan.price}/month</span>
        </p>
      </div>

      <div className="pt-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-2">Usage</h3>
        <pre className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed">
          {JSON.stringify(user.usage, null, 2)}
        </pre>
      </div>

      <button
        onClick={() => openBillingModal()}
        className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono uppercase tracking-wider font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-orange-600/20"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-200" />
        Change Plan
      </button>

      {/* Internal modal fallback when rendered standalone without openBillingModal prop */}
      {internalModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setInternalModalOpen(false)}
        >
          <div
            id="billingModal"
            className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
              <h2 className="text-2xl font-bold text-zinc-100">Choose Your Plan</h2>
              <button
                onClick={() => setInternalModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-2 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.values(SUBSCRIPTION_PLANS).map((p) => (
                  <div key={p.id} className="planCard rounded-xl p-5 flex flex-col justify-between border border-zinc-800 bg-zinc-950/80">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-100">{p.name}</h3>
                      <p className="text-xl font-bold text-white mb-4">${p.price}/month</p>
                    </div>
                    <button
                      onClick={() => {
                        window.location.href = `/api/billing/checkout?planId=${p.id}`;
                      }}
                      className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs uppercase font-bold rounded"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Interactive High-Fidelity Presets for Testing
const SAMPLE_FILES = {
  pdf: {
    fileName: 'multnomah_civil_trespass_evidence.pdf',
    fileSize: '412 KB',
    content: 'EXHIBIT A: Multnomah County Civil Claim. On January 12th, 2026, defendant Gregory Smith unlawfully entered the plaintiff\'s property lines situated near NW Germantown Road, Portland, OR. The defendant dismantled seventy feet of premium cedar fencing, operating heavy machinery without legal easement rights. This constitutes a direct encroachment under Oregon Revised Statutes ORS 105.115 (unlawful entry) and ORS 164.245 (criminal trespass). Damages requested exceed statutory ceilings.',
  },
  image: {
    fileName: 'gate_warning_photograph.jpg',
    fileSize: '2.4 MB',
    content: 'IMAGE LOG CORPUS: Photograph taken on February 10, 2026 at 14:15. Depicts a clear public Notice of Private Boundary sign posted prominently on the eastern corral gate. The sign says "NO PUBLIC TRAFFIC - PRIVATELY SEEDED OREGON LAND - TRES_PASSERS WILL BE FINED UNDER ORS 105.110". In background, track marks of defendant\'s red John Deere tractor are visible bypassing the fencing post.',
  },
  docx: {
    fileName: 'amended_property_boundary_agreement.docx',
    fileSize: '88 KB',
    content: 'COVENANT AMENDMENT: Ground Covenants and Boundary Reservation Agreement drafted on April 15, 2025. Specifying that the eastern timber corridor of parcel #4521 is exclusively apportioned to the designated owner. Land boundaries are strictly tracked under Multnomah Title Standard 5.2. Neither agent nor third-party commercial contractors shall lease equipment or dump lumber wastes.',
  },
  notes: {
    fileName: 'eyewitness_deposition_deposition_transcript.txt',
    fileSize: '12 KB',
    content: 'WITNESS REPORT STATEMENT: "I, Brenda Vance, resident of the adjacent lot, observed a flatbed commercial transport truck backing wood scraps and heavy lumber pallets into the eastern paddock on February 18, 2026. The driver said he was sub-contracted by Greg Smith. Pointed out that Greg told him that standard Multnomah SLR restrictions were suspended during county highway construction. This clearly violates local zoning and boundaries covenants."',
  }
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  activeCase, 
  onTabChange, 
  onUpdateCase,
  userPlan = 'free',
  onPlanChanged,
  userId = 'current-user',
  user
}) => {
  const resolvedUser = user || {
    id: userId,
    email: 'counsel@manifold.local',
    plan: userPlan,
    usage: {
      cases: 1,
      evidence: activeCase.evidence.length,
      exports: 0,
      ai_summaries: 0,
    }
  };

  // Billing Modal State & Handlers
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);

  const openBillingModal = () => setIsBillingModalOpen(true);
  const closeBillingModal = () => {
    setIsBillingModalOpen(false);
    setBillingError(null);
  };

  const startCheckout = async (planId: string) => {
    if (planId === 'free') {
      if (onPlanChanged) onPlanChanged('free');
      closeBillingModal();
      return;
    }

    setIsCheckingOut(planId);
    setBillingError(null);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, userId })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        if (onPlanChanged) onPlanChanged(planId as SubscriptionPlanId);
        closeBillingModal();
      }
    } catch (err: any) {
      console.warn('Stripe checkout error (sandbox update):', err);
      setBillingError(
        err.message?.includes('STRIPE_SECRET_KEY')
          ? 'Stripe secret key not configured in sandbox. Upgraded locally for testing.'
          : err.message || 'Checkout failed'
      );
      if (onPlanChanged) {
        onPlanChanged(planId as SubscriptionPlanId);
      }
    } finally {
      setIsCheckingOut(null);
    }
  };

  // General UI state
  const [copied, setCopied] = useState(false);
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeClaims, setIncludeClaims] = useState(true);

  // --- 1. EVIDENCE INTAKE STATE ---
  const [selectedPresetType, setSelectedPresetType] = useState<'pdf' | 'image' | 'docx' | 'notes'>('pdf');
  const [ingestedFileName, setIngestedFileName] = useState('multnomah_civil_trespass_evidence.pdf');
  const [ingestedFileSize, setIngestedFileSize] = useState('412 KB');
  const [evidenceContent, setEvidenceContent] = useState(SAMPLE_FILES.pdf.content);
  const [evidenceClassification, setEvidenceClassification] = useState<'exhibit' | 'transcript' | 'correspondence' | 'pleading' | 'other'>('exhibit');
  const [evidenceDate, setEvidenceDate] = useState('2026-01-12');
  const [isProcessingEvidence, setIsProcessingEvidence] = useState(false);
  const [evidenceMessage, setEvidenceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Current Analyzed Evidence Preview Pane Output (to visualize "outputs": ["metadata", "summary", "issueTags"])
  const [latestAnalysisOutput, setLatestAnalysisOutput] = useState<{
    fileName: string;
    fileSize: string;
    issueTags: string[];
    metadata: Record<string, string>;
    summary: string;
  } | null>({
    fileName: 'multnomah_civil_trespass_evidence.pdf',
    fileSize: '412 KB',
    issueTags: ['Unlawful Boundary Entry', 'Malicious Trespass', 'Property Damages'],
    metadata: {
      'Source File': 'multnomah_civil_trespass_evidence.pdf',
      'Extracted Author': 'Claimant Counselor',
      'Audit Date': '2026-01-12',
      'Jurisdiction Focus': 'Multnomah County Circuit Court',
      'Pleadings Class': 'Factual Exhibit Proof'
    },
    summary: 'A direct grievance stating unlawful entry and removal of fence boundaries by Defendant on NW Germantown road. Involves specific ORS 105.115 and 164.245 code violations.'
  });

  // --- 2. TIMELINE STATES ---
  const [selectedTimelineEvidence, setSelectedTimelineEvidence] = useState<string[]>([]);
  const [chronologyFeed, setChronologyFeed] = useState('');
  const [isBuildingTimeline, setIsBuildingTimeline] = useState(false);
  const [timelineMessage, setTimelineMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showJsonExportModal, setShowJsonExportModal] = useState(false);
  const [backupToastMessage, setBackupToastMessage] = useState<string | null>(null);

  // --- EXECUTIVE SUMMARY STATES ---
  const [executiveSummary, setExecutiveSummary] = useState<string>(() => {
    return activeCase.executiveSummary || localStorage.getItem(`manifold_exec_summary_${activeCase.id || 'default'}`) || '';
  });
  const [executiveSummaryDate, setExecutiveSummaryDate] = useState<string>(() => {
    return activeCase.executiveSummaryGeneratedAt || localStorage.getItem(`manifold_exec_summary_date_${activeCase.id || 'default'}`) || '';
  });
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [isSummaryCopied, setIsSummaryCopied] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);

  // --- 3. DRAFT GENERATOR STATES ---
  const [includeTimelineInDraft, setIncludeTimelineInDraft] = useState(true);
  const [includeNotesInDraft, setIncludeNotesInDraft] = useState(true);
  const [draftType, setDraftType] = useState<'motion' | 'declaration' | 'summary'>('motion');
  const [draftPromptSpecs, setDraftPromptSpecs] = useState('');
  const [draftModel, setDraftModel] = useState('gemini-3.5-flash');
  const [isDrafting, setIsDrafting] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [draftSavedMessage, setDraftSavedMessage] = useState('');

  // --- AUTOMATED LEGAL RESEARCH CO-INTEGRATION STATES ---
  const [autoResearchFindings, setAutoResearchFindings] = useState<any[]>([]);
  const [isAutoResearching, setIsAutoResearching] = useState(false);
  const [autoResearchEnabled, setAutoResearchEnabled] = useState(true);

  // --- 4. REASONING TOOLS STATES ---
  const [selectedReasoningEvidence, setSelectedReasoningEvidence] = useState<string[]>([]);
  const [includeDraftsInReasoning, setIncludeDraftsInReasoning] = useState(true);
  const [reasoningReportClass, setReasoningReportClass] = useState<'legalReasoning' | 'proceduralAnalysis'>('legalReasoning');
  const [reasoningModel, setReasoningModel] = useState('gemini-3.5-flash');
  const [isReasoning, setIsReasoning] = useState(false);
  const [reasoningResult, setReasoningResult] = useState('');

  // --- 5. CASE NOTES STATES (Saves strictly "Local" dynamically via localStorage) ---
  const notesLocalStorageKey = `manifold_hybrid_notes_${activeCase.id || 'default'}`;
  const [caseNotes, setCaseNotes] = useState(() => {
    return localStorage.getItem(notesLocalStorageKey) || activeCase.notes || '';
  });
  const [isNotesAiProcessing, setIsNotesAiProcessing] = useState(false);
  const [notesStatus, setNotesStatus] = useState<'saved' | 'saving' | 'changed'>('saved');

  // --- 6. SETTINGS & INTEGRATIONS STATES ---
  const [googleKeepStatus, setGoogleKeepStatus] = useState<'offline' | 'connected' | 'syncing'>('connected');
  const [keepSyncLogs, setKeepSyncLogs] = useState<string[]>(['[14:49:02] Keep API handshaked with Google OAuth Scope.', '[14:50:11] 1 Active text brief exported securely.']);
  const [billingCredits, setBillingCredits] = useState({ used: 12.45, max: 100.00, inputTokens: 412500, outputTokens: 884000 });
  const [agentPlatformEndpoint, setAgentPlatformEndpoint] = useState('https://agentplatform.google.aistudio.internal/nodes/v1');
  const [agentAuthStatus, setAgentAuthStatus] = useState<'active' | 'authenticating'>('active');
  const [testPing, setTestPing] = useState<{ status: 'idle' | 'pinging' | 'online' | 'error'; latency?: number }>({ status: 'idle' });

  // Sync notes local and activeCase
  useEffect(() => {
    const loadedNotes = localStorage.getItem(notesLocalStorageKey) || activeCase.notes || '';
    setCaseNotes(loadedNotes);
    setNotesStatus('saved');
  }, [activeCase.id]);

  // Sync executive summary local and activeCase
  useEffect(() => {
    const loadedSummary = activeCase.executiveSummary || localStorage.getItem(`manifold_exec_summary_${activeCase.id || 'default'}`) || '';
    const loadedDate = activeCase.executiveSummaryGeneratedAt || localStorage.getItem(`manifold_exec_summary_date_${activeCase.id || 'default'}`) || '';
    setExecutiveSummary(loadedSummary);
    setExecutiveSummaryDate(loadedDate);
  }, [activeCase.id, activeCase.executiveSummary, activeCase.executiveSummaryGeneratedAt]);

  // Handle Preset file selection
  const handlePresetSelect = (presetKey: 'pdf' | 'image' | 'docx' | 'notes') => {
    setSelectedPresetType(presetKey);
    const data = SAMPLE_FILES[presetKey];
    setEvidenceContent(data.content);
    
    // Auto-align metadata attributes for high usability playground feel
    if (presetKey === 'pdf') {
      setIngestedFileName('multnomah_civil_trespass_evidence.pdf');
      setIngestedFileSize('412 KB');
      setEvidenceClassification('exhibit');
      setEvidenceDate('2026-01-12');
    } else if (presetKey === 'image') {
      setIngestedFileName('gate_warning_photograph.jpg');
      setIngestedFileSize('2.4 MB');
      setEvidenceClassification('exhibit');
      setEvidenceDate('2026-02-10');
    } else if (presetKey === 'docx') {
      setIngestedFileName('amended_property_boundary_agreement.docx');
      setIngestedFileSize('88 KB');
      setEvidenceClassification('correspondence');
      setEvidenceDate('2025-04-15');
    } else {
      setIngestedFileName('eyewitness_deposition_transcript.txt');
      setIngestedFileSize('12 KB');
      setEvidenceClassification('transcript');
      setEvidenceDate('2026-02-18');
    }
  };

  const parseCleanJson = (rawText: string) => {
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(json)?\n?/, '');
      cleaned = cleaned.replace(/\s*```$/, '');
    }
    return JSON.parse(cleaned);
  };

  // --- 1. EVIDENCE INTAKE PRODUCERS ---
  const handleEvidenceIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceContent.trim()) {
      setEvidenceMessage({ type: 'error', text: 'Evidence content corpus is empty.' });
      return;
    }

    setIsProcessingEvidence(true);
    setEvidenceMessage(null);

    const prompt = `You are a high-fidelity intelligence parsing agent for Oregon Courts (ORS & UTCR standards).
Analyze following document corpus:
"${evidenceContent}"

Filename Reference: "${ingestedFileName}"
MIME Context Format: "${selectedPresetType.toUpperCase()}"
Suggested Event Date: "${evidenceDate}"

Extract structured metadata, issue tags, and high-quality legal brief. 
You must respond strictly with a valid JSON structure matching this model. Do NOT write conversational preamble:
{
  "title": "Clean concise courtroom legal proof title, e.g., 'Warning Gate Posting Photograph'",
  "author": "Estimated author, surveyor, clerk, or 'Unknown'",
  "issueTags": ["Short Tag A", "Short Tag B", "Short Tag C (Must relate to statutory issues e.g. breach, trespass)"],
  "summary": "1-2 sentence high-level professional assessment of this file as a lawsuit exhibit"
}
`;

    try {
      const gRes = await generateContentProxy({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      let responseJson = {
        title: ingestedFileName.replace(/\.[^/.]+$/, ""),
        author: 'Unknown',
        issueTags: ['Extracted Exhibit', 'Oregon Law'],
        summary: evidenceContent.substring(0, 160) + '...'
      };

      try {
        const parsed = parseCleanJson(gRes.text);
        if (parsed.title) responseJson.title = parsed.title;
        if (parsed.author) responseJson.author = parsed.author;
        if (parsed.issueTags) responseJson.issueTags = parsed.issueTags;
        if (parsed.summary) responseJson.summary = parsed.summary;
      } catch (jsonErr) {
        console.warn("Could not parse JSON cleanly, proceeding with defaults", jsonErr);
      }

      // 1. Create the structured evidence item
      const newEvidenceItem: Evidence = {
        id: `EV-${Date.now()}`,
        title: responseJson.title,
        type: evidenceClassification,
        content: evidenceContent,
        date: evidenceDate || undefined,
        summary: responseJson.summary,
        fileSize: ingestedFileSize,
        fileName: ingestedFileName,
        tags: responseJson.issueTags
      };

      // 2. Set the visualized "outputs": ["metadata", "summary", "issueTags"]
      setLatestAnalysisOutput({
        fileName: ingestedFileName,
        fileSize: ingestedFileSize,
        issueTags: responseJson.issueTags,
        metadata: {
          'Analyzed Title': responseJson.title,
          'Estimated Author': responseJson.author,
          'Extracted Incident Date': evidenceDate,
          'Pleadings Class Code': evidenceClassification.toUpperCase(),
          'Document Format Type': selectedPresetType.toUpperCase(),
        },
        summary: responseJson.summary
      });

      // 3. Update the global applet case context
      const updatedEvidenceList = [newEvidenceItem, ...activeCase.evidence];
      onUpdateCase({
        ...activeCase,
        evidence: updatedEvidenceList
      });

      setEvidenceMessage({
        type: 'success',
        text: `Successfully ingested "${newEvidenceItem.title}" with automated tags: [${responseJson.issueTags.join(', ')}]`
      });

      // Incremental add to selected timeline checkbox list so the user can easily map it next
      setSelectedTimelineEvidence(prev => [...prev, newEvidenceItem.id]);
      setSelectedReasoningEvidence(prev => [...prev, newEvidenceItem.id]);
    } catch (err: any) {
      console.error(err);
      setEvidenceMessage({ type: 'error', text: err.message || 'Verification proxy timed out.' });
    } finally {
      setIsProcessingEvidence(false);
    }
  };

  // --- 2. TIMELINE CHRONOLOGY AND JSON EXPORT PRODUCERS ---
  const handleTimelineBuild = async () => {
    setIsBuildingTimeline(true);
    setTimelineMessage(null);

    // Feed selected evidence items + custom events string
    const targetEvidenceObjects = activeCase.evidence.filter(e => selectedTimelineEvidence.includes(e.id));
    
    let consolidatedSource = `EXISTING CATALOGED EXHBIT EVIDENCE CONTEXTS:\n`;
    targetEvidenceObjects.forEach(e => {
      consolidatedSource += `- [${e.date || 'No Date'}] "${e.title}": ${e.content}\n`;
    });

    if (chronologyFeed.trim()) {
      consolidatedSource += `\nUNSTRUCTURED CASE DIARY CHRONOLOGY FEEDS:\n${chronologyFeed.trim()}`;
    }

    const prompt = `You are a professional legal chronicler specializing in Oregon state trials.
Given the following chaotic or multi-source evidentiary statements, extract and construct a structured chronological chart of events.

INPUT FACT DATA:
${consolidatedSource}

Your response must strictly be a valid JSON array of event items. Write absolutely no preambles, no conversational notes:
[
  {
    "date": "YYYY-MM-DD",
    "title": "A short, formal event title",
    "summary": "1 sentence rich context explaining the significance of this event to the ORS trial",
    "classification": "EXHIBIT_CORRELATION | BREACH | INTERACTION | NOTICE_SERVED"
  }
]
`;

    try {
      const gRes = await generateContentProxy({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      const parsedChronology = parseCleanJson(gRes.text);
      if (!Array.isArray(parsedChronology)) {
        throw new Error("Timeline did not parse to a valid sequential array.");
      }

      // Convert returned chronology events block into case evidence items with explicit date/summary characteristics
      const newChronologicalEvidenceItems: Evidence[] = parsedChronology.map((item: any, index: number) => ({
        id: `EV-CHRONO-${Date.now()}-${index}`,
        title: item.title || `Chronology Occurence`,
        type: 'exhibit',
        content: item.summary || 'Chronological occurrence context.',
        date: item.date || undefined,
        summary: item.summary || undefined,
        tags: [item.classification || 'Chronology']
      }));

      const updatedEvidence = [...activeCase.evidence, ...newChronologicalEvidenceItems];
      onUpdateCase({
        ...activeCase,
        evidence: updatedEvidence
      });

      setChronologyFeed('');
      setTimelineMessage({
        type: 'success',
        text: `Constructed ${newChronologicalEvidenceItems.length} synchronized sequence plot points and incorporated into Chronology Map.`
      });
    } catch (err: any) {
      console.error(err);
      setTimelineMessage({ type: 'error', text: err.message || 'Gemini Flash timeline computation interrupted.' });
    } finally {
      setIsBuildingTimeline(false);
    }
  };

  // Client-Side download exporter for chronology JSON
  const handleDownloadTimelineJson = () => {
    const timelines = activeCase.evidence
      .filter(e => e.date)
      .sort((a,b) => (a.date || '').localeCompare(b.date || ''))
      .map(e => ({
        id: e.id,
        date: e.date,
        title: e.title,
        summary: e.summary || e.content,
        assignedTags: e.tags || []
      }));

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(timelines, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `Oregon_Legal_Manifold_Chronology_${activeCase.id || 'case'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // --- 3. DRAFT GENERATOR PRODUCERS ---
  const handleDraftGeneration = async () => {
    setIsDrafting(true);
    setGeneratedDraft('');
    setDraftSavedMessage('');

    let researchedCitations: any[] = [];
    if (autoResearchEnabled) {
      setIsAutoResearching(true);
      try {
        const res = await fetch('/api/research/auto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activeCase })
        });
        if (res.ok) {
          const data = await res.json();
          researchedCitations = data.findings || [];
          setAutoResearchFindings(researchedCitations);
        }
      } catch (err) {
        console.error("Auto legal research in draft generation failed:", err);
      } finally {
        setIsAutoResearching(false);
      }
    }

    // Construct precise contextual inputs: ["timeline", "caseNotes"]
    let integratedContext = ``;

    if (researchedCitations.length > 0) {
      integratedContext += `\nDYNAMICALLY DISCOVERED STATUTORY CODES & JUDICIAL COURT PRECEDENTS (AUTOMATED LEXIS / WESTLAW NETWORK SENSING):\n`;
      researchedCitations.forEach((f, idx) => {
        integratedContext += `[Authority #${idx+1}] CITATION: ${f.title} | TYPE: ${f.sourceType} | HOLDING APPLICATION: "${f.snippet}" | REF: ${f.url}\n`;
      });
      integratedContext += `\nCRITICAL WRITING DIRECTIVE FOR CITATIONS:\n`;
      integratedContext += `You MUST cite and integrate these legal authorities directly inside the body of the drafted document below where appropriate. Formulate solid legal analyses Applying the holdings of these cases to the facts of this client case.\n`;
    }

    if (includeTimelineInDraft) {
      const chronologicallyOrdered = [...activeCase.evidence]
        .filter(e => e.date)
        .sort((a,b) => (a.date || '').localeCompare(b.date || ''));
      integratedContext += `\nCHRONOLOGY MAP SEQUENCE EVENTS:\n`;
      chronologicallyOrdered.forEach((item, idx) => {
        integratedContext += `[${idx+1}] DATE: ${item.date} | TITLE: ${item.title} | DETAIL: ${item.summary || item.content}\n`;
      });
    }

    if (includeNotesInDraft && caseNotes.trim()) {
      integratedContext += `\nPRACTITIONER CASE SCRATCHPAD NOTES:\n${caseNotes.trim()}\n`;
    }

    const draftTypeLabels = {
      motion: 'Formal Pleading Court Motion (Motion in Limine / Motion to Compel)',
      declaration: 'Formal Declaration of Counsel / Attestation of Facts',
      summary: 'Executive Discovery case Summary and Litigation Roadmap'
    };

    const prompt = `You are a elite Oregon Civil Trial Counselor. Draft a pristine, highly formal, court-compliant legal document.

DOCUMENT TARGET TYPE: "${draftTypeLabels[draftType]}"
JURISDICTION VENUE: "${activeCase.jurisdiction || 'Circuit Court of Oregon'}"
ORCP / UTCR PROCEDURE LEVEL: "${activeCase.courtRules || 'ORS Uniform Trial Court Rules'}"
LAWSUIT CASE MATTER: "${activeCase.name}"

INTEGRATED EVIDENCE FACTS & CLIENT TIMELINE SEQUENCE:
${integratedContext}

ADDITIONAL CRITICAL DIRECTIVES OR CASE ACCENTS:
${draftPromptSpecs || 'Ensure professional standard Oregon civil pleading formats with numbered factual paragraph allegations, court table header caps, and proper signature blocks.'}

Draft the complete legal transcript. Format with elite Markdown styling. Do not write placeholders. Maintain extreme statutory rigor.
`;

    try {
      const gRes = await generateContentProxy({
        model: draftModel,
        contents: prompt
      });

      setGeneratedDraft(gRes.text || 'Failed to produce draft transcript.');
    } catch (err: any) {
      console.error(err);
      setGeneratedDraft(`### Draft Intervention\nAn error occurred while communicating with the AgentPlatform node: ${err.message || 'Transient network abort.'}`);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleSaveDraftAsExhibit = () => {
    if (!generatedDraft) return;

    const documentKey = `${draftType}_artifact_${Date.now()}`;
    const newEvidenceEntry: Evidence = {
      id: `EV-DRAFT-${Date.now()}`,
      title: `Generated ${draftType.toUpperCase()} - ${new Date().toLocaleDateString()}`,
      type: 'pleading',
      content: generatedDraft,
      date: new Date().toISOString().split('T')[0],
      summary: `Automated ${draftType} document draft compiled using Advanced AgentPlatform. Cites active case facts.`,
      tags: ['Automated Draft', draftType]
    };

    const updatedEvidence = [newEvidenceEntry, ...activeCase.evidence];
    
    // Save generatedDocs
    const updatedGeneratedDocs = {
      ...activeCase.generatedDocs,
      [documentKey]: generatedDraft
    };

    onUpdateCase({
      ...activeCase,
      evidence: updatedEvidence,
      generatedDocs: updatedGeneratedDocs
    });

    setDraftSavedMessage(`Draft document securely cataloged as Case Exhibit Evidence item!`);
    setTimeout(() => setDraftSavedMessage(''), 4000);
  };

  // --- 4. REASONING TOOLS PRODUCERS ---
  const handleReasoningEngine = async () => {
    setIsReasoning(true);
    setReasoningResult('');

    // Resolve structural inputs: ["evidence", "drafts"]
    const targetEvidence = activeCase.evidence.filter(e => selectedReasoningEvidence.includes(e.id));
    const generatedDraftCount = Object.keys(activeCase.generatedDocs).length;

    let consolidatedScope = `EVIDENTIARY INPUT MATRIX:\n`;
    targetEvidence.forEach(e => {
      consolidatedScope += `- [EXHIBIT ${e.id}] Title: ${e.title} | Content Summary: ${e.summary || e.content}\n`;
    });

    if (includeDraftsInReasoning && generatedDraftCount > 0) {
      consolidatedScope += `\nGENERATED COURT DRAFTS IN SCOPE:\n`;
      Object.entries(activeCase.generatedDocs).forEach(([key, val]) => {
        if (val) consolidatedScope += `- [DRAFT KEY: ${key}] Preview: ${val.substring(0, 300)}...\n`;
      });
    }

    const reportStyles = {
      legalReasoning: 'Deep Legal Reasoning Report examining ORS statutory sufficiency, citation compliance, case-law strength indexes, and risk bounds.',
      proceduralAnalysis: 'Procedural Compliance Checklist verifying UTCR / SLR alignment, formatting requirements, filing dates limits, and ORCP Rule 21 procedural objections.'
    };

    const prompt = `You are a Supreme Court Legal Analyst specializing in Oregon Revised Statutes (ORS). Solve following audit request.

SELECTED REPORT SUITE: "${reportStyles[reasoningReportClass]}"
MUNICIPAL DISTRICT COURT: "${activeCase.jurisdiction}"
COUNCIL RULES: "${activeCase.courtRules}"
CASE IDENTIFICATION: "${activeCase.name}"

MATERIAL CORPUS IN REVIEW:
${consolidatedScope}

Conduct a high-density legal analysis. You must cite real Oregon code sections (such as ORS 12.110, ORS 20.080, UTCR Rule 5, ORCP 21, and county-specific SLR supplements) where appropriate. Provide objective strengths, weaknesses, and clear actionable recommendations for counsel. Format beautifully in Markdown.
`;

    try {
      const gRes = await generateContentProxy({
        model: reasoningModel,
        contents: prompt
      });

      setReasoningResult(gRes.text || 'Statutory reasoner failed to yield analysis.');
    } catch (err: any) {
      console.error(err);
      setReasoningResult(`### Reasoning Failure\nCould not query model: ${err.message || 'Connection refused.'}`);
    } finally {
      setIsReasoning(false);
    }
  };

  // --- 5. CASE NOTES AUTOSAVE AND AI REWRITE/EXPAND/CONDENSE/TAGS PERSISTENCE ---
  const handleSyncNotesLocalOnly = (updatedText: string) => {
    localStorage.setItem(notesLocalStorageKey, updatedText);
    setNotesStatus('saving');
    
    // Also save metadata case notes
    onUpdateCase({
      ...activeCase,
      notes: updatedText
    });
    
    setTimeout(() => {
      setNotesStatus('saved');
    }, 400);
  };

  const handleNotesAiTransformation = async (action: 'rewrite' | 'expand' | 'condense' | 'tag') => {
    if (!caseNotes.trim()) return;

    setIsNotesAiProcessing(true);
    setNotesStatus('saving');

    const actionPrompts = {
      rewrite: 'Rewrite the following legal notes to match a highly objective, professional, and clear trial-attorney drafting style. Maintain all critical dates and names.',
      expand: 'Expand these rough litigation notes. Add professional sub-headers including: "I. Factual Context", "II. Key Claims", "III. Next Trial Tasks", "IV. Statutory Reference" and detail all facts thoroughly.',
      condense: 'Condense these case notes into a high-density, action-oriented outline with bulleted legal findings and timelines.',
      tag: 'Analyze these trial notes and append a distinct block at the bottom labeled "OREGON CIVIL PROCEDURAL TAGS:" with relevant trial tags (e.g. #ORS105Warning, #MultnomahSLR, #DiscoveryDeadline).'
    };

    const prompt = `You are an elite Oregon paralegal. Take these case working notes and process them using this instruction:
"${actionPrompts[action]}"

CASE NOTES TO TRANSFORM:
"""
${caseNotes}
"""

Respond strictly with the transformed text body and nothing else:
`;

    try {
      const gRes = await generateContentProxy({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      const processedText = gRes.text || caseNotes;
      setCaseNotes(processedText);
      localStorage.setItem(notesLocalStorageKey, processedText);
      
      onUpdateCase({
        ...activeCase,
        notes: processedText
      });

      setNotesStatus('saved');
    } catch (err) {
      console.error("AI notes transformation failed", err);
      setNotesStatus('changed');
    } finally {
      setIsNotesAiProcessing(false);
    }
  };

  // --- 6. SETTINGS & SIMULATED INTEGRATIONS HANDLERS ---
  const handleSyncGoogleKeep = () => {
    setGoogleKeepStatus('syncing');
    setTimeout(() => {
      const timestamp = new Date().toLocaleTimeString();
      setKeepSyncLogs(prev => [
        `[${timestamp}] Google Keep Synchronized: Exported case notes outline (${caseNotes.substring(0, 40)}...)`,
        ...prev
      ]);
      setGoogleKeepStatus('connected');
    }, 1200);
  };

  const handleAdjustBillingSim = () => {
    setBillingCredits(prev => ({
      ...prev,
      used: Math.min(prev.used + 2.14, 100),
      inputTokens: prev.inputTokens + 48000,
      outputTokens: prev.outputTokens + 95000
    }));
  };

  const handlePingIntegrations = async () => {
    setTestPing({ status: 'pinging' });
    const startTime = Date.now();
    try {
      await generateContentProxy({
        model: 'gemini-3.5-flash',
        contents: 'Ping check. Respond "OK".'
      });
      const endTime = Date.now();
      setTestPing({ status: 'online', latency: endTime - startTime });
    } catch {
      setTestPing({ status: 'error' });
    }
  };

  const handleGenerateExecutiveSummary = async (openModal: boolean = false) => {
    setIsGeneratingSummary(true);
    setSummaryError('');
    if (openModal) {
      setShowSummaryModal(true);
    }

    try {
      let summaryText = '';
      
      // Attempt primary dedicated server-side summary endpoint
      try {
        const response = await fetch('/api/case/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activeCase })
        });
        if (response.ok) {
          const data = await response.json();
          summaryText = data.text || '';
        } else {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.details || errData.error || 'Server endpoint returned non-200');
        }
      } catch (endpointErr: any) {
        console.warn("[DASHBOARD] /api/case/summary fetch fallback:", endpointErr?.message || endpointErr);
        
        // Fallback to client proxy route with gemini-3.8-flash
        const evidenceList = (activeCase.evidence || []).map((e, idx) => 
          `• Exhibit #${idx + 1}: [Type: ${e.type}] "${e.title}" (Date: ${e.date || 'N/A'})\n  Summary: ${e.summary || (e.content ? e.content.substring(0, 160) + '...' : 'N/A')}\n  Tags: ${e.tags?.join(', ') || 'None'}`
        ).join('\n\n');

        const claimsList = (activeCase.claims || []).map((c, idx) =>
          `• Claim #${idx + 1}: "${c.title}"\n  Description: ${c.description || 'N/A'}\n  Associated Evidence IDs: ${(c.evidenceIds || []).join(', ') || 'None'}\n  ORS Citation: ${c.orsCitation || 'N/A'}`
        ).join('\n\n');

        const prompt = `You are a high-level senior legal strategist and appellate analyst specializing in Oregon litigation (ORS, UTCR, ORCP).

Generate a high-level, bulleted executive summary of the current case based on existing evidence and claims.

CASE NAME: "${activeCase.name || 'Untitled Case'}"
JURISDICTION: ${activeCase.jurisdiction || 'Circuit Court of Oregon'}
PROCEDURAL RULES: ${activeCase.courtRules || 'Oregon Uniform Trial Court Rules / ORCP'}

EXISTING LEGAL CLAIMS:
${claimsList || 'No formal legal claims registered yet.'}

EXISTING EVIDENCE MANIFOLD:
${evidenceList || 'No evidence exhibits uploaded yet.'}

PRACTITIONER SCRATCHPAD NOTES:
${caseNotes || 'None recorded.'}

FORMATTING INSTRUCTIONS:
- Synthesize an executive-level, bulleted summary directly actionable for lead counsel and clients.
- Organize strictly into the following four clear bulleted categories:
  ### • Core Claims & Legal Causes of Action
    - High-level bullet points summarizing each claim, legal basis (e.g. ORS codes), and primary target of relief.
  ### • Key Evidentiary Facts & Proof Corroboration
    - Bullet points highlighting the strongest evidence exhibits, verified dates, and key evidentiary anchors.
  ### • Evidentiary Vulnerabilities & Statute of Limitations Exposure
    - High-level bullet points noting any gaps, unverified dates, or claims lacking corroborating exhibits.
  ### • Strategic Counsel Action Items & Procedural Roadmap
    - Action-oriented bullet points outlining immediate litigation priorities, filing prerequisites, or dispositive motion readiness.
- Keep every single item as a concise, substantive, high-density bullet point.
- Do NOT write lengthy conversational intro or outro paragraphs; focus strictly on structured, high-level bulleted intelligence.`;

        const gRes = await generateContentProxy({
          model: 'gemini-3.8-flash',
          contents: prompt
        });

        summaryText = gRes?.text || '';
      }

      if (!summaryText.trim()) {
        throw new Error("Received empty summary from the AI gateway.");
      }

      const timestamp = new Date().toLocaleString();
      setExecutiveSummary(summaryText);
      setExecutiveSummaryDate(timestamp);
      localStorage.setItem(`manifold_exec_summary_${activeCase.id || 'default'}`, summaryText);
      localStorage.setItem(`manifold_exec_summary_date_${activeCase.id || 'default'}`, timestamp);

      // Persist on activeCase
      onUpdateCase({
        ...activeCase,
        executiveSummary: summaryText,
        executiveSummaryGeneratedAt: timestamp
      });
    } catch (err: any) {
      console.error("Failed to generate executive summary:", err);
      setSummaryError(err.message || 'Failed to complete AI generation. Please check your connection or retry.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(executiveSummary);
      setIsSummaryCopied(true);
      setTimeout(() => setIsSummaryCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy summary to clipboard:", err);
    }
  };

  const handleDownloadManifold = () => {
    try {
      const result = downloadCaseBackupJson(activeCase);
      setBackupToastMessage(`Successfully exported ${result.fileName} (${result.sizeFormatted} • ${result.totalEvents} timeline plot points)`);
      setTimeout(() => setBackupToastMessage(null), 6000);
    } catch (err) {
      console.error("Failed to export case backup:", err);
      alert("Failed to export case backup state.");
    }
  };

  // Render variables
  const limitationsSummary = evaluateAllCaseLimitations(activeCase);

  const stats = [
    { label: 'Evidence Managed', value: activeCase.evidence.length, icon: <Database className="w-4 h-4" />, color: 'text-orange-500', tab: 'evidence' },
    { label: 'Active Legal Claims', value: activeCase.claims.length, icon: <Zap className="w-4 h-4" />, color: 'text-amber-500', tab: 'claims' },
    { 
      label: 'Statute Limitations', 
      value: (limitationsSummary.expiredCount + limitationsSummary.criticalCount) > 0 
        ? `${limitationsSummary.expiredCount + limitationsSummary.criticalCount} At Risk` 
        : `${limitationsSummary.totalClaimsCount} Monitored`, 
      icon: <Clock className="w-4 h-4" />, 
      color: (limitationsSummary.expiredCount + limitationsSummary.criticalCount) > 0 ? 'text-red-500' : 'text-amber-500', 
      tab: 'limitations_audit' 
    },
    { label: 'Filing Compliance', value: activeCase.isFinalized ? 'COMPLIANT' : 'DRAFT', icon: <Scale className="w-4 h-4" />, color: 'text-zinc-400', tab: 'checklist' },
  ];

  const recentEvidence = [...activeCase.evidence]
    .sort((a,b) => b.id.localeCompare(a.id))
    .slice(0, 4);

  return (
    <div className="space-y-12 pb-24 text-zinc-150 relative" id="hybrid-dashboard-container">
      
      {/* 1. Header Hero & Title Branding */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-zinc-800 pb-8 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-sm border border-amber-500/30">
              <Workflow className="w-6 h-6 text-amber-500 animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-serif italic text-zinc-100 tracking-tight font-bold">
                Oregon Legal Manifold <span className="text-zinc-500 font-sans text-xs font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-2 py-1 rounded ml-2">Hybrid Edition</span>
              </h1>
              <p className="text-xs text-zinc-400 font-mono mt-1">
                Unified statutory matrix for Multnomah County Circuit Courtyard litigation workspace
              </p>
            </div>
          </div>
        </div>

        {/* Top telemetry states */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-mono py-1 px-3 rounded bg-zinc-900 border border-zinc-850 text-zinc-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
            AgentPlatform Gateway Online
          </span>
          <button
            onClick={() => onTabChange('checklist')}
            className="text-[10px] uppercase font-mono tracking-wider py-2 px-4 rounded bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-all flex items-center gap-2 font-bold cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" /> View Compliance Checklists
          </button>
          {/* Export Case Backup (Evidence, Claims, Timeline) */}
          <div className="flex items-center">
            <button
              onClick={handleDownloadManifold}
              className="text-[10px] uppercase font-mono tracking-wider py-2 px-3 rounded-l bg-zinc-900 text-zinc-200 border border-zinc-800 hover:border-zinc-700 hover:text-white hover:bg-zinc-850 transition-all flex items-center gap-2 font-bold cursor-pointer shadow-sm"
              title="Download structured case backup as JSON (includes evidence, claims, and chronological timeline)"
            >
              <FileDown className="w-4 h-4 text-orange-500" /> Export Case Backup (JSON)
            </button>
            <button
              onClick={() => setShowJsonExportModal(true)}
              className="text-[10px] uppercase font-mono tracking-wider py-2 px-2.5 rounded-r bg-zinc-900 text-zinc-400 border-y border-r border-zinc-800 hover:border-zinc-700 hover:text-zinc-200 hover:bg-zinc-850 transition-all flex items-center justify-center font-bold cursor-pointer shadow-sm"
              title="Inspect backup breakdown, copy JSON, or view structured schema preview"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => handleGenerateExecutiveSummary(true)}
            className="text-[10px] uppercase font-mono tracking-wider py-2 px-4 rounded bg-orange-650 hover:bg-orange-500 text-white font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-orange-550/20"
            title="Generate AI-powered comprehensive executive summary & litigation strategic briefing"
          >
            <Sparkles className="w-4 h-4 text-amber-300" /> Generate Executive Summary
          </button>

          <button
            onClick={() => openBillingModal()}
            className="text-[10px] uppercase font-mono tracking-wider py-2 px-4 rounded bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-orange-500/20"
            title="Choose or upgrade your subscription plan"
          >
            <Sparkles className="w-4 h-4 text-amber-200" /> Upgrade Plan
          </button>
        </div>
      </div>

      {/* Backup Download Toast Notification */}
      {backupToastMessage && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-xs font-mono text-emerald-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{backupToastMessage}</span>
          </div>
          <button
            onClick={() => setShowJsonExportModal(true)}
            className="text-[10px] uppercase font-bold text-emerald-400 hover:text-emerald-200 underline cursor-pointer"
          >
            Inspect Backup Data
          </button>
        </div>
      )}

      {/* 2. Interactive Metrics Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="hybrid-stats-board">
        {stats.map((stat, idx) => (
          <button
            key={stat.label}
            onClick={() => onTabChange(stat.tab)}
            className="p-5 bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-850 hover:border-zinc-700/60 rounded-md transition-all text-left flex items-start justify-between cursor-pointer group"
          >
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">
                {stat.label}
              </span>
              <p className="text-2xl font-serif italic font-bold text-zinc-100">
                {stat.value}
              </p>
            </div>
            <div className={cn("p-2.5 bg-zinc-950 rounded-md border border-zinc-850 group-hover:bg-zinc-900 transition-colors", stat.color)}>
              {stat.icon}
            </div>
          </button>
        ))}
      </div>

      {/* ==================== AI EXECUTIVE SUMMARY MODULE ==================== */}
      <div className="bg-zinc-900/60 border border-zinc-850 rounded-xl p-6 shadow-xl space-y-4" id="hybrid-executive-summary-module">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded border border-amber-500/30">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-mono uppercase tracking-wider font-bold text-zinc-100">
                  Case Executive Summary
                </h3>
                <span className="text-[9px] font-mono text-amber-400 font-bold py-0.5 px-2 bg-amber-950/40 rounded border border-amber-800/40">
                  Gemini 3.8 Flash
                </span>
                <span className="text-[9px] font-mono text-zinc-400 py-0.5 px-2 bg-zinc-950 rounded border border-zinc-800">
                  High-Level Bulleted Briefing
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Automated statutory case synthesis grounded in existing evidence ({activeCase.evidence.length} exhibits) and active claims ({activeCase.claims.length} claims)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {executiveSummary && (
              <>
                <button
                  onClick={handleCopySummary}
                  className="py-1.5 px-3 rounded bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-mono text-zinc-300 uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Copy executive summary markdown to clipboard"
                >
                  {isSummaryCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowSummaryModal(true)}
                  className="py-1.5 px-3 rounded bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-mono text-zinc-300 uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Maximize into modal reading view"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Full View</span>
                </button>
              </>
            )}

            <button
              onClick={() => handleGenerateExecutiveSummary(false)}
              disabled={isGeneratingSummary}
              className="py-1.5 px-3.5 rounded bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-zinc-950 font-mono text-[10px] uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-amber-950/20"
            >
              {isGeneratingSummary ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Case...</span>
                </>
              ) : executiveSummary ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-Generate Summary</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Executive Summary</span>
                </>
              )}
            </button>

            {executiveSummary && (
              <button
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                className="p-1.5 rounded bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                title={isSummaryExpanded ? "Collapse summary" : "Expand summary"}
              >
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", !isSummaryExpanded && "-rotate-90")} />
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        {isGeneratingSummary ? (
          <div className="py-10 bg-zinc-950/60 rounded-lg border border-zinc-850/80 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
            <div className="space-y-1">
              <p className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-bold">
                Synthesizing Case Evidence & Legal Claims
              </p>
              <p className="text-[11px] text-zinc-500 max-w-lg font-mono">
                Gemini 3.8 Flash is cross-referencing {activeCase.claims.length} claims and {activeCase.evidence.length} evidence exhibits into high-level bulleted strategic findings...
              </p>
            </div>
          </div>
        ) : summaryError ? (
          <div className="p-4 bg-red-950/25 border border-red-900/50 rounded-lg text-red-400 font-mono text-xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-bold uppercase">Executive Summary Generation Interrupted</p>
                <p className="text-zinc-400">{summaryError}</p>
              </div>
            </div>
            <button
              onClick={() => handleGenerateExecutiveSummary(false)}
              className="px-3 py-1 bg-red-900/40 hover:bg-red-900/60 border border-red-800 text-red-200 rounded text-[10px] font-bold uppercase cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : executiveSummary ? (
          isSummaryExpanded && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 px-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                  Grounded in {activeCase.evidence.length} evidence items and {activeCase.claims.length} claims
                </span>
                {executiveSummaryDate && (
                  <span>Generated: {executiveSummaryDate}</span>
                )}
              </div>

              <div className="p-5 bg-zinc-950/80 border border-zinc-850/80 rounded-lg max-h-[380px] overflow-y-auto space-y-3 text-zinc-300 font-sans leading-relaxed selection:bg-amber-950 selection:text-amber-200">
                <div className="prose prose-invert prose-sm max-w-none prose-headings:font-mono prose-headings:text-amber-400 prose-headings:text-xs prose-headings:uppercase prose-headings:tracking-wider prose-headings:border-b prose-headings:border-zinc-850 prose-headings:pb-1 prose-headings:mt-4 prose-headings:first:mt-0 prose-ul:my-2 prose-li:my-1 prose-li:text-xs prose-li:text-zinc-300">
                  <ReactMarkdown>{executiveSummary}</ReactMarkdown>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="py-8 px-6 bg-zinc-950/50 rounded-lg border border-dashed border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-xs font-mono uppercase font-bold text-zinc-300 flex items-center gap-2 justify-center sm:justify-start">
                <FileText className="w-4 h-4 text-amber-500" />
                No Executive Summary Generated Yet
              </h4>
              <p className="text-[11px] text-zinc-500 font-mono max-w-xl">
                Generate a high-level, bulleted executive summary of {activeCase.name} using Gemini. Automatically cross-references all {activeCase.claims.length} legal claims and {activeCase.evidence.length} evidence exhibits into an actionable litigation briefing.
              </p>
            </div>
            <button
              onClick={() => handleGenerateExecutiveSummary(false)}
              disabled={isGeneratingSummary}
              className="px-4 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono text-[10px] uppercase tracking-wider font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-md shadow-amber-950/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Executive Summary</span>
            </button>
          </div>
        )}
      </div>

      {/* ==================== AUTOMATED STATUTE OF LIMITATIONS MONITOR ==================== */}
      <div className="bg-zinc-900/60 border border-zinc-850 rounded-xl p-6 shadow-xl space-y-4" id="hybrid-limitations-module">
        <LimitationsAudit 
          activeCase={activeCase} 
          onUpdateCase={onUpdateCase} 
          onNavigateToTab={onTabChange}
          isDashboardEmbedded={true}
        />
      </div>

      {/* 3. CORE COCKPIT INTERACTION BOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COMPARTMENT: Evidence Intake & Timeline Builder (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-10">
          
          {/* ==================== MODULE 1: EVIDENCE INTAKE ==================== */}
          <div className="bg-zinc-900/60 border border-zinc-850 rounded-xl p-6 space-y-6 shadow-xl" id="hybrid-intake-module">
            <header className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-orange-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-200">
                  Case Evidence Intake Engine
                </h3>
              </div>
              <span className="text-[9px] font-mono text-zinc-500 uppercase font-bold py-0.5 px-2 bg-zinc-950 rounded border border-zinc-850">
                Gemini Flash Parser
              </span>
            </header>

            {/* Selector for input files class */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">
                Select Input Type Reference:
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'pdf', title: 'PDF Doc', icon: <FileText className="w-3.5 h-3.5 text-red-400" /> },
                  { key: 'image', title: 'Image', icon: <CameraIcon className="w-3.5 h-3.5 text-blue-400" /> },
                  { key: 'docx', title: 'DOCX file', icon: <FileCode className="w-3.5 h-3.5 text-emerald-400" /> },
                  { key: 'notes', title: 'Text/Notes', icon: <FileSignature className="w-3.5 h-3.5 text-amber-400" /> }
                ].map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handlePresetSelect(opt.key as any)}
                    className={cn(
                      "py-2 px-2.5 rounded border font-mono text-[10px] flex flex-col items-center gap-1.5 transition-all text-center uppercase cursor-pointer",
                      selectedPresetType === opt.key 
                        ? "bg-zinc-900 border-amber-500 text-zinc-100 shadow-md shadow-amber-950/20" 
                        : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:border-zinc-805 hover:bg-zinc-900"
                    )}
                  >
                    {opt.icon}
                    <span>{opt.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active file details preview */}
            <div className="p-3 bg-zinc-950 border border-zinc-900 rounded font-mono text-[10px] flex items-center justify-between text-zinc-400">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-zinc-600" />
                <span>Active Target: <strong className="text-zinc-200">{ingestedFileName}</strong></span>
              </div>
              <span className="text-zinc-500">Size: {ingestedFileSize}</span>
            </div>

            <form onSubmit={handleEvidenceIntake} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono uppercase text-zinc-400 block font-bold">Exhibit Classification</label>
                  <select
                    value={evidenceClassification}
                    onChange={(e) => setEvidenceClassification(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-sm py-2 px-3 text-xs text-zinc-300 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="exhibit">Exhibit (Documentary Proof)</option>
                    <option value="transcript">Official Deposition / Hearing Transcript</option>
                    <option value="correspondence">Administrative Correspondence</option>
                    <option value="pleading">Court Filings & Pleadings</option>
                    <option value="other">Other Trial Asset</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono uppercase text-zinc-400 block font-bold">Filing Event Date Accents</label>
                  <input
                    type="date"
                    value={evidenceDate}
                    onChange={(e) => setEvidenceDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-sm py-1 px-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase text-zinc-400 block font-bold">
                  Raw Text Body / Content Extractor Context
                </label>
                <textarea
                  value={evidenceContent}
                  onChange={(e) => setEvidenceContent(e.target.value)}
                  placeholder="Paste direct transcripts, contracts, spatial surveys, or emails to begin parsing structured litigation metadata..."
                  className="w-full h-32 bg-zinc-950 border border-zinc-850 rounded-sm p-3 text-xs font-sans text-zinc-300 focus:outline-none focus:border-amber-500 transition-colors leading-relaxed resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessingEvidence || !evidenceContent.trim()}
                className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-mono text-[10px] py-2.5 uppercase tracking-widest font-bold rounded-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-950/20"
              >
                {isProcessingEvidence ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Ingest through Gemini Flash...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Run Metadata & Issue-Tags Parse</span>
                  </>
                )}
              </button>
            </form>

            {/* Process message */}
            {evidenceMessage && (
              <div className={cn(
                "p-3 rounded border text-xs leading-relaxed font-mono",
                evidenceMessage.type === 'success' 
                  ? "bg-green-950/20 border-green-900/40 text-green-300" 
                  : "bg-red-950/20 border-red-900/40 text-red-300"
              )}>
                {evidenceMessage.text}
              </div>
            )}

            {/* VISUALIZED OUTPUT FOR EVIDENCE INTAKE ("outputs": ["metadata", "summary", "issueTags"]) */}
            {latestAnalysisOutput && (
              <div className="bg-zinc-950/90 border border-zinc-800 rounded-lg p-5 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="font-mono text-[10px] text-zinc-400 tracking-wider font-bold">
                    [PARSED INTELLIGENCE SUMMARY OUTPUT]
                  </span>
                  <span className="font-mono text-[9px] text-amber-500 uppercase font-bold">
                    Compliance Active
                  </span>
                </div>

                {/* Grid for metadata */}
                <div className="space-y-3">
                  <div>
                    <span className="text-[9px] font-mono uppercase text-zinc-500 font-bold block mb-1">
                      Metadata:
                    </span>
                    <div className="grid grid-cols-2 gap-2 bg-zinc-900/40 p-2.5 rounded border border-zinc-900">
                      {Object.entries(latestAnalysisOutput.metadata).map(([key, val]) => (
                        <div key={key} className="flex flex-col gap-0.5">
                          <span className="text-[8px] font-mono uppercase text-zinc-550">{key}</span>
                          <span className="text-[10px] font-mono text-zinc-300 truncate">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono uppercase text-zinc-500 font-bold block">
                      Factual Summary:
                    </span>
                    <p className="text-zinc-300 bg-zinc-900/20 p-2.5 border border-zinc-900 rounded font-sans leading-relaxed">
                      {latestAnalysisOutput.summary}
                    </p>
                  </div>

                  {/* Issue Tags */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono uppercase text-zinc-500 font-bold block">
                      Extracted Court Issue Tags:
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {latestAnalysisOutput.issueTags.map((tag, i) => (
                        <span 
                          key={tag + i} 
                          className="px-2.5 py-1 text-[9px] font-mono uppercase rounded-sm bg-orange-950/30 text-orange-400 border border-orange-900/40 font-bold"
                        >
                          #{tag.replace(/\s+/g, '-').toLowerCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ==================== MODULE 2: TIMELINE BUILDER ==================== */}
          <div className="bg-zinc-900/60 border border-zinc-850 rounded-xl p-6 space-y-6" id="hybrid-timeline-module">
            <header className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-200">
                  Case Timeline Chronographer
                </h3>
              </div>
              <span className="text-[8px] font-mono text-zinc-500 uppercase font-bold py-0.5 px-2 bg-zinc-950 rounded border border-zinc-850">
                Cascade Engine
              </span>
            </header>

            <div className="space-y-4">
              
              {/* INPUTS: [evidence, events] */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                  1. Input Evidence Selection:
                </span>
                <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-lg space-y-2 max-h-[140px] overflow-y-auto">
                  {activeCase.evidence.length === 0 ? (
                    <span className="text-[10px] font-mono text-zinc-600 block text-center py-4">
                      No case evidence in scope. Run Ingestion above first.
                    </span>
                  ) : (
                    activeCase.evidence.map(e => {
                      const isChecked = selectedTimelineEvidence.includes(e.id);
                      return (
                        <label key={e.id} className="flex items-start gap-2.5 text-[11px] text-zinc-350 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedTimelineEvidence(prev =>
                                isChecked ? prev.filter(id => id !== e.id) : [...prev, e.id]
                              );
                            }}
                            className="mt-0.5 rounded bg-zinc-950 border-zinc-800 text-amber-500 focus:ring-amber-500"
                          />
                          <span className="font-mono">
                            [{e.date || 'UNDATED'}] <span className="text-zinc-200 font-serif italic truncate">{e.title}</span> ({e.fileName || 'notes'})
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold">
                    2. Unstructured Incident Diary Stream (Optional):
                  </span>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase">Input Event Diary</span>
                </div>
                <textarea
                  value={chronologyFeed}
                  onChange={(e) => setChronologyFeed(e.target.value)}
                  placeholder="On Feb 12th, Greg dumped tractor waste. On March 1, I sent the ORS 105 compliant warning letter but it was ignored..."
                  className="w-full h-20 bg-zinc-950 border border-zinc-850 rounded-sm p-3.5 text-xs text-zinc-300 font-mono resize-none focus:outline-none focus:border-amber-505 placeholder-zinc-700"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleTimelineBuild}
                  disabled={isBuildingTimeline || (selectedTimelineEvidence.length === 0 && !chronologyFeed.trim())}
                  className="flex-1 bg-zinc-950 hover:bg-zinc-900 text-amber-500 border border-amber-500/25 hover:border-amber-500 font-mono text-[9px] py-2 uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2 cursor-pointer font-bold disabled:opacity-40"
                >
                  {isBuildingTimeline ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sliders className="w-3.5 h-3.5" />
                  )}
                  <span>Run Sequence Synthesizer</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTimelineJson}
                  className="px-4 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-350 hover:text-zinc-100 rounded-sm font-mono text-[9px] uppercase tracking-wider font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Export timeline sequence array as compliance standard JSON"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
              </div>

              {timelineMessage && (
                <div className={cn(
                  "p-3 rounded border text-[10px] font-mono leading-tight",
                  timelineMessage.type === 'success' 
                    ? "bg-green-950/20 border-green-900/40 text-green-300" 
                    : "bg-red-950/20 border-red-900/40 text-red-300"
                )}>
                  {timelineMessage.text}
                </div>
              )}

              {/* CHRONOLOGY CHART COMPACT OUTPUT */}
              <div className="bg-zinc-950/60 p-4 border border-zinc-850 rounded-lg">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-4 font-mono text-[9px] text-zinc-500">
                  <span>ACTIVELY PLOTTED CHRONOLOGY CHAIN</span>
                  <span>
                    {activeCase.evidence.filter(e => e.date).length} items registered
                  </span>
                </div>

                <div className="relative border-l border-zinc-800 ml-2.5 pl-5 space-y-6 max-h-[220px] overflow-y-auto">
                  {activeCase.evidence.filter(e => e.date).length === 0 ? (
                    <div className="py-6 text-center text-[10px] font-mono text-zinc-600 block uppercase">
                      No sequenced events found. Ingest dated documents to map chronological flow.
                    </div>
                  ) : (
                    [...activeCase.evidence]
                      .filter(e => e.date)
                      .sort((a,b) => (a.date || '').localeCompare(b.date || ''))
                      .map((item, idx) => (
                        <div key={item.id} className="relative text-left group">
                          <div className="absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-zinc-950 group-hover:bg-amber-400 transition-colors" />
                          <p className="text-[9px] font-mono text-amber-500 font-bold leading-none mb-1">
                            {item.date}
                          </p>
                          <h5 className="text-xs font-bold text-zinc-200 leading-tight">
                            {item.title}
                          </h5>
                          {item.summary && (
                            <p className="text-[10px] text-zinc-400 font-sans leading-relaxed mt-1">
                              {item.summary}
                            </p>
                          )}
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {item.tags.map(t => (
                                <span key={t} className="text-[7.5px] font-mono bg-zinc-900 text-zinc-500 px-1 py-0.5 rounded border border-zinc-850 uppercase">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT COMPARTMENT: Draft Generator, Reasoning Tools & Settings (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-10">
          
          {/* ==================== MODULE 3: DRAFT GENERATOR ==================== */}
          <div className="bg-zinc-900/60 border border-zinc-850 rounded-xl p-6 space-y-6 shadow-xl" id="hybrid-draft-module">
            <header className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-200">
                  Case Draft Synthesizer
                </h3>
              </div>
              <span className="text-[8px] font-mono text-zinc-500 uppercase font-bold py-0.5 px-2 bg-zinc-950 rounded border border-zinc-850">
                AgentPlatform
              </span>
            </header>

            <div className="space-y-4">
              
              {/* INPUT CHECKLISTS: ["timeline", "caseNotes"] */}
              <div className="space-y-2 p-3 bg-zinc-950 border border-zinc-850 rounded-lg">
                <span className="text-[9px] font-mono uppercase text-zinc-500 font-bold block mb-1.5">
                  1. Check inputs to incorporate inside the Draft context:
                </span>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs text-zinc-350 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeTimelineInDraft}
                      onChange={(e) => setIncludeTimelineInDraft(e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-800 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="font-mono text-[10px] uppercase">
                      Chronology timeline ({activeCase.evidence.filter(ev=>ev.date).length} items)
                    </span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-xs text-zinc-350 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeNotesInDraft}
                      onChange={(e) => setIncludeNotesInDraft(e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-800 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="font-mono text-[10px] uppercase">
                      Practitioner Local Notes ({caseNotes.length} chars)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-zinc-350 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoResearchEnabled}
                      onChange={(e) => setAutoResearchEnabled(e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-800 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="font-mono text-[10px] uppercase text-orange-400 font-bold">
                      Westlaw / Lexis / Free Law API Automatic Sync
                    </span>
                  </label>
                </div>
              </div>

              {/* AUTOMATED LEGAL RESEARCH DYNAMIC COMPILATION OUTPUT PANEL */}
              {isAutoResearching ? (
                <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg flex items-center justify-center gap-2 text-zinc-400">
                  <Loader2 className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                  <span className="text-[9px] font-mono uppercase tracking-wider animate-pulse text-zinc-400">
                    Querying Westlaw & CourtListener APIs...
                  </span>
                </div>
              ) : autoResearchFindings.length > 0 && (
                <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono uppercase text-teal-400 font-bold block">
                      Auto-Searched Precedents & Code Citations ({autoResearchFindings.length})
                    </span>
                    <span className="text-[8px] font-mono text-zinc-550">Grounded Map Live</span>
                  </div>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {autoResearchFindings.map((finding, idx) => (
                      <div key={idx} className="p-1.5 bg-zinc-900/60 border border-zinc-850/60 rounded text-[9px]">
                        <div className="flex items-center justify-between mb-0.5 font-mono">
                          <strong className="text-orange-400 font-bold text-[9.5px]">{finding.title}</strong>
                          <span className="text-[7px] uppercase bg-zinc-800 text-zinc-400 px-1 rounded">{finding.sourceType}</span>
                        </div>
                        <p className="text-zinc-400 leading-snug line-clamp-2">{finding.snippet}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono uppercase text-zinc-400 font-bold block">Document Output Class</label>
                  <select
                    value={draftType}
                    onChange={(e) => setDraftType(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-sm py-1.5 px-2.5 text-xs text-zinc-350 focus:outline-none focus:border-amber-500"
                  >
                    <option value="motion">Pleading / Motion in Limine</option>
                    <option value="declaration">Affidavit / Declaration</option>
                    <option value="summary">Discovery / Summary Brief</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono uppercase text-zinc-400 font-bold block">Agent Node</label>
                  <select
                    value={draftModel}
                    onChange={(e) => setDraftModel(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-sm py-1.5 px-2.5 text-xs text-zinc-350 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep)</option>
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash (Quick)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase text-zinc-400 font-bold block">Custom Background Mandates</label>
                <textarea
                  value={draftPromptSpecs}
                  onChange={(e) => setDraftPromptSpecs(e.target.value)}
                  placeholder="e.g. Demand full statutory fees under ORS 20.080 line items..."
                  className="w-full h-16 bg-zinc-950 border border-zinc-850 rounded-sm p-2 text-xs font-mono text-zinc-350 focus:outline-none focus:border-amber-500 placeholder-zinc-700"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDraftGeneration}
                  disabled={isDrafting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-650 text-white font-mono text-[9px] py-2 uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-950/20"
                >
                  {isDrafting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing nodes and writing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Instruct Agent Platform Write</span>
                    </>
                  )}
                </button>

                {generatedDraft && (
                  <button
                    type="button"
                    onClick={handleSaveDraftAsExhibit}
                    className="px-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-emerald-400 transition-colors cursor-pointer"
                    title="Incorporate generated draft as dynamic case evidence artifact"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>
                )}
              </div>

              {draftSavedMessage && (
                <p className="text-[10px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 p-2 text-center rounded-sm leading-tight">
                  {draftSavedMessage}
                </p>
              )}

              {/* Draft Transcript Display */}
              {generatedDraft && (
                <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-lg max-h-[180px] overflow-y-auto space-y-2 text-xs select-text text-zinc-400">
                  <header className="flex items-center justify-between border-b border-zinc-900 pb-1 mb-2 font-mono text-[8px] text-zinc-600 uppercase tracking-widest">
                    <span>GENERATED PLEADING TRANSCRIPT COMPLIANT FILE</span>
                    <span>Scroll to preview</span>
                  </header>
                  <div className="prose prose-invert prose-xs text-left max-w-none">
                    <ReactMarkdown>{generatedDraft}</ReactMarkdown>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ==================== MODULE 4: REASONING TOOLS ==================== */}
          <div className="bg-zinc-900/60 border border-zinc-850 rounded-xl p-6 space-y-6 shadow-xl" id="hybrid-reasoning-module">
            <header className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-200">
                  ORS Statutory Reasoner
                </h3>
              </div>
              <span className="text-[8px] font-mono text-zinc-500 uppercase font-bold py-0.5 px-2 bg-zinc-950 rounded border border-zinc-850">
                Gemini Flash
              </span>
            </header>

            <div className="space-y-4">
              
              {/* INPUTS: ["evidence", "drafts"] */}
              <div className="space-y-2">
                <span className="text-[9px] font-mono uppercase text-zinc-450 font-bold block">
                  1. Check Evidence items for Statutory Review:
                </span>
                <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded space-y-1.5 max-h-[110px] overflow-y-auto">
                  {activeCase.evidence.map(e => {
                    const isChecked = selectedReasoningEvidence.includes(e.id);
                    return (
                      <label key={e.id} className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedReasoningEvidence(prev =>
                              isChecked ? prev.filter(id => id !== e.id) : [...prev, e.id]
                            );
                          }}
                          className="rounded bg-zinc-900 border-zinc-850 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="font-mono truncate">{e.title}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {Object.keys(activeCase.generatedDocs).length > 0 && (
                <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer select-none p-2 bg-zinc-950 border border-zinc-900 rounded">
                  <input
                    type="checkbox"
                    checked={includeDraftsInReasoning}
                    onChange={(e) => setIncludeDraftsInReasoning(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-800 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="font-mono uppercase font-bold text-zinc-300">
                    Audit All {Object.keys(activeCase.generatedDocs).length} Generated Pleadings Documents
                  </span>
                </label>
              )}

              <div className="grid grid-cols-2 gap-35">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono uppercase text-zinc-400 font-bold block">Output Audit Track</label>
                  <select
                    value={reasoningReportClass}
                    onChange={(e) => setReasoningReportClass(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-sm py-1.5 px-2.5 text-xs text-zinc-350 focus:outline-none focus:border-amber-500"
                  >
                    <option value="legalReasoning">Legal Reasoning Report</option>
                    <option value="proceduralAnalysis">Procedural Compliance</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono uppercase text-zinc-400 font-bold block">Reasoning Engine</label>
                  <select
                    value={reasoningModel}
                    onChange={(e) => setReasoningModel(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-sm py-1.5 px-2.5 text-xs text-zinc-350 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReasoningEngine}
                disabled={isReasoning}
                className="w-full bg-zinc-950 hover:bg-zinc-950 border border-purple-500/30 hover:border-purple-400 text-purple-400 font-mono text-[9px] py-2.5 uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isReasoning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing active statutory issues...</span>
                  </>
                ) : (
                  <>
                    <Scale className="w-3.5 h-3.5" />
                    <span>Analyze ORS/UTCR Trial Sufficiency</span>
                  </>
                )}
              </button>

              {reasoningResult && (
                <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-lg max-h-[170px] overflow-y-auto space-y-2 text-xs select-text text-zinc-400">
                  <header className="flex items-center justify-between border-b border-zinc-900 pb-1 mb-2 font-mono text-[8px] text-zinc-600 uppercase tracking-widest">
                    <span>Audit Report Output</span>
                    <span>Gemini Compliance Node</span>
                  </header>
                  <div className="prose prose-invert prose-xs text-left max-w-none">
                    <ReactMarkdown>{reasoningResult}</ReactMarkdown>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* 4. CASE NOTES & INTEGRATION EXPORTS BOX (lg:col-span-12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ==================== MODULE 5: CASE NOTES SCRATCHPAD ==================== */}
        <div className="lg:col-span-12 bg-zinc-900/60 border border-zinc-850 rounded-xl p-6 space-y-6 shadow-xl" id="hybrid-notes-module">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-4">
            <div className="flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-amber-500" />
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-200 block">
                  Counsel Case Notes & Active Scratchpad
                </h3>
                <span className="text-[9px] text-zinc-500 font-mono tracking-tight block mt-0.5">
                  Storage Type: <span className="text-amber-500 font-bold">LOCAL (Strict localStorage Persistence)</span>
                </span>
              </div>
            </div>

            {/* AI transformation actions: ["rewrite", "expand", "condense", "tag"] */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[8px] font-mono uppercase text-zinc-500 tracking-wider font-bold mr-1 block sm:hidden">
                AI Actions:
              </span>
              {[
                { label: 'ATTORNEY REWRITE', action: 'rewrite' },
                { label: 'EXPAND HEADERS', action: 'expand' },
                { label: 'CONDENSE OUTLINE', action: 'condense' },
                { label: 'TAG ISSUES', action: 'tag' }
              ].map(opt => (
                <button
                  key={opt.action}
                  type="button"
                  onClick={() => handleNotesAiTransformation(opt.action as any)}
                  disabled={isNotesAiProcessing || !caseNotes.trim()}
                  className="px-2.5 py-1 text-[8.5px] font-mono text-amber-500 uppercase bg-zinc-950 hover:bg-zinc-900 disabled:opacity-40 rounded border border-amber-500/20 hover:border-amber-500 transition-colors cursor-pointer font-bold"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </header>

          <div className="space-y-4">
            <textarea
              value={caseNotes}
              onChange={(e) => {
                setCaseNotes(e.target.value);
                setNotesStatus('changed');
              }}
              onBlur={() => handleSyncNotesLocalOnly(caseNotes)}
              placeholder="Start drafting rough testimony notes, deposition outlines, and strategic trial insights. Local persistence ensures instant browser reload protection..."
              className="w-full h-44 bg-zinc-950 border border-zinc-850 rounded-sm p-4 text-xs text-zinc-200 font-sans focus:outline-none focus:border-amber-500 transition-all leading-relaxed"
            />

            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-500 leading-none">
                Volume: <strong>{caseNotes.length}</strong> characters written locally
              </span>

              <div className="flex items-center gap-2">
                {isNotesAiProcessing ? (
                  <span className="text-amber-500 flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Transforming Notes via Flash...</span>
                  </span>
                ) : (
                  <>
                    {notesStatus === 'saved' && (
                      <span className="text-emerald-500 flex items-center gap-1 font-bold">
                        <Check className="w-3.5 h-3.5" /> Local Persistence Active
                      </span>
                    )}
                    {notesStatus === 'saving' && (
                      <span className="text-amber-500 flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Synchronizing...
                      </span>
                    )}
                    {notesStatus === 'changed' && (
                      <button
                        onClick={() => handleSyncNotesLocalOnly(caseNotes)}
                        className="text-amber-500 hover:text-amber-400 font-bold transition-all uppercase underline hover:no-underline cursor-pointer"
                      >
                        Force Local sync
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ==================== BILLING OVERVIEW DASHBOARD ==================== */}
      <BillingDashboard user={resolvedUser} openBillingModal={openBillingModal} />

      {/* 5. SETTINGS & PLUGINS MATRIX: ["GoogleKeepAPI", "Billing", "AgentPlatform"] */}
      <div className="bg-zinc-900/60 border border-zinc-850 rounded-xl p-6 space-y-6 shadow-xl" id="hybrid-integrations-settings-module">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-amber-500" />
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-200 block">
                Dashboard Connections & Satellite Integrations
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono tracking-tight mt-0.5">
                Active third-party APIs, credit models, and agent credentials
              </p>
            </div>
          </div>
          
          <button
            onClick={handlePingIntegrations}
            disabled={testPing.status === 'pinging'}
            className="text-[9px] font-mono uppercase py-1.5 px-3 border border-zinc-800 rounded hover:border-zinc-700 hover:bg-zinc-950 text-amber-500 font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={cn("w-3 h-3", testPing.status === 'pinging' && "animate-spin")} />
            <span>Connection Telemetry Audit</span>
          </button>
        </header>

        {/* 3 Columns representing our core integration hooks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* A. GOOGLE KEEP API SATELLITE */}
          <div className="bg-zinc-950/80 p-5 rounded-lg border border-zinc-850/80 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[8px] font-mono text-zinc-550 uppercase tracking-widest font-bold block">
                  Service 01:
                </span>
                <h4 className="text-xs font-bold text-zinc-150 font-mono uppercase">
                  Google Keep API Sync
                </h4>
              </div>
              <span className="text-[9px] font-mono font-bold bg-green-950/30 text-green-400 border border-green-900/40 px-2 py-0.5 rounded">
                CONNECTED
              </span>
            </div>

            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Export and download counsel note briefs immediately as Google Keep checklists for safe fieldwork.
            </p>

            <button
              onClick={handleSyncGoogleKeep}
              disabled={googleKeepStatus === 'syncing' || !caseNotes.trim()}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 disabled:opacity-45 text-amber-500 border border-amber-500/10 font-mono text-[9px] uppercase tracking-wider font-bold rounded cursor-pointer transition-colors"
            >
              {googleKeepStatus === 'syncing' ? 'Transmitting Notes...' : 'Sync Scratchpad to Keep'}
            </button>

            {/* Micro sync telemetry logs review */}
            <div className="pt-2">
              <span className="text-[8px] font-mono text-zinc-550 uppercase font-bold block mb-1">Sync Telemetry Log:</span>
              <div className="bg-zinc-900/40 border border-zinc-900 p-2 rounded h-14 overflow-y-auto font-mono text-[8px] text-zinc-500 space-y-1">
                {keepSyncLogs.map((log, i) => (
                  <div key={i} className="truncate">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* B. BILLING & TOKEN CAPACITY TRACKER */}
          <div className="bg-zinc-950/80 p-5 rounded-lg border border-zinc-850/80 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[8px] font-mono text-zinc-550 uppercase tracking-widest font-bold block">
                  Service 02:
                </span>
                <h4 className="text-xs font-bold text-zinc-150 font-mono uppercase">
                  Billing & API Credits
                </h4>
              </div>
              <span className="text-[9px] font-mono font-bold bg-amber-950/30 text-amber-400 border border-amber-900/40 px-2 py-0.5 rounded">
                SUITE ACTIVE
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-[10px] text-zinc-400">
              <div className="flex justify-between">
                <span>Credit Usage:</span>
                <span className="text-zinc-200">${billingCredits.used.toFixed(2)} / ${billingCredits.max.toFixed(2)}</span>
              </div>
              <div className="w-full bg-zinc-900 h-1 rounded overflow-hidden">
                <div 
                  className="bg-amber-500 h-1 transition-all duration-300" 
                  style={{ width: `${(billingCredits.used / billingCredits.max) * 100}%` }}
                />
              </div>
              <div className="flex justify-between pt-1">
                <span>Input tokens:</span>
                <span className="text-zinc-300">{billingCredits.inputTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Output tokens:</span>
                <span className="text-zinc-300">{billingCredits.outputTokens.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={handleAdjustBillingSim}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border border-zinc-800 font-mono text-[9px] uppercase tracking-wider font-bold rounded cursor-pointer transition-colors"
            >
              Simulate Active Model Use (+$2.14)
            </button>
          </div>

          {/* C. AGENT PLATFORM ROUTE GATEWAY */}
          <div className="bg-zinc-950/80 p-5 rounded-lg border border-zinc-850/80 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[8px] font-mono text-zinc-550 uppercase tracking-widest font-bold block">
                  Service 03:
                </span>
                <h4 className="text-xs font-bold text-zinc-150 font-mono uppercase">
                  AgentPlatform Router
                </h4>
              </div>
              <span className="text-[9px] font-mono font-bold bg-purple-950/30 text-purple-400 border border-purple-900/40 px-2 py-0.5 rounded">
                SECURE
              </span>
            </div>

            <div className="space-y-2 text-[10px] font-mono">
              <span className="text-zinc-500 block uppercase text-[8px] font-bold">Node Endpoint Endpoint:</span>
              <input
                type="text"
                value={agentPlatformEndpoint}
                onChange={(e) => setAgentPlatformEndpoint(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-850 rounded py-1 px-2 text-[9px] text-zinc-300 focus:outline-none focus:border-amber-500"
              />
              <div className="flex justify-between text-[9px] text-zinc-500 pt-1">
                <span>Default Core:</span>
                <span className="text-zinc-350">gemini-3.1-pro-preview</span>
              </div>
              <div className="flex justify-between text-[9px] text-zinc-500">
                <span>Compute status:</span>
                <span className="text-green-500">READY</span>
              </div>
            </div>

            <div className="p-2.5 bg-zinc-900/40 rounded border border-zinc-900 font-mono text-[8px] text-zinc-500 text-center leading-normal">
              Authorization active under default workspace key profile. Deep-agent tools accessible.
            </div>
          </div>

        </div>

        {/* Telemetry response log */}
        {testPing.status !== 'idle' && (
          <div className={cn(
            "p-3 rounded font-mono text-[10px] flex items-center gap-2 border",
            testPing.status === 'pinging' && "bg-zinc-950 text-zinc-500 border-zinc-900",
            testPing.status === 'online' && "bg-green-950/15 text-green-400 border-green-900/40",
            testPing.status === 'error' && "bg-red-950/15 text-red-400 border-red-900/40"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full inline-block",
              testPing.status === 'pinging' && "bg-zinc-500 animate-pulse",
              testPing.status === 'online' && "bg-green-500",
              testPing.status === 'error' && "bg-red-500"
            )} />
            <span>
              {testPing.status === 'pinging' && "Conducting full active legal model handshake..."}
              {testPing.status === 'online' && `Handshake Successful! Current response path latency: ${testPing.latency}ms.`}
              {testPing.status === 'error' && "Handshake failed. Ensure deep model quotas or bypass offline mode."}
            </span>
          </div>
        )}
      </div>

      {/* ==================== EXECUTIVE SUMMARY MODAL ==================== */}
      <AnimatePresence>
        {showSummaryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!isGeneratingSummary) setShowSummaryModal(false); }}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Header */}
              <header className="p-5 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-orange-500/10 border border-orange-500/20 rounded-sm">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-serif italic text-zinc-150 font-bold">
                      Case Executive Summary & Briefing
                    </h3>
                    <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">
                      Grounded in active manifold: {activeCase.name}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowSummaryModal(false)}
                  disabled={isGeneratingSummary}
                  className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-30 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </header>

              {/* Scrollable Content Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {isGeneratingSummary ? (
                  <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                    <div className="space-y-1">
                      <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                        Synthesizing Case Intelligence...
                      </p>
                      <p className="text-[10px] text-zinc-650 max-w-md">
                        Compiling procedural stance, weighing evidence matrix relevance, and structuring strategic briefing guidelines using Gemini AI.
                      </p>
                    </div>
                  </div>
                ) : summaryError ? (
                  <div className="p-4 bg-red-950/25 border border-red-900/50 rounded text-red-400 font-mono text-xs flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-bold uppercase">AI Synthesis Interrupted</p>
                      <p>{summaryError}</p>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-sm text-left max-w-none text-zinc-300 font-sans leading-relaxed selection:bg-orange-950 selection:text-orange-200">
                    <ReactMarkdown>{executiveSummary}</ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Footer */}
              {!isGeneratingSummary && !summaryError && executiveSummary && (
                <footer className="p-4 border-t border-zinc-900 flex items-center justify-between bg-zinc-900/20">
                  <span className="text-[9px] font-mono text-zinc-600 uppercase">
                    Compiled via gemini-3.8-flash
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCopySummary}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-mono text-zinc-300 uppercase tracking-wider font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isSummaryCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-green-400">Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Summary</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleGenerateExecutiveSummary(true)}
                      className="px-4 py-2 bg-orange-650 hover:bg-orange-550 border border-transparent text-[10px] font-mono text-white uppercase tracking-wider font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Re-Synthesize</span>
                    </button>
                  </div>
                </footer>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== CASE BACKUP & EXPORT MODAL ==================== */}
      <CaseBackupModal
        isOpen={showJsonExportModal}
        onClose={() => setShowJsonExportModal(false)}
        activeCase={activeCase}
      />

      {/* ==================== BILLING MODAL ==================== */}
      {isBillingModalOpen && (
        <div
          id="billingModalBackdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeBillingModal}
        >
          <div
            id="billingModal"
            className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-orange-400 font-bold">
                  Subscription Tiers
                </span>
                <h2 className="text-2xl font-bold text-zinc-100 mt-1">Choose Your Plan</h2>
                <p className="text-xs font-mono text-zinc-400 mt-0.5">
                  Select a subscription plan that fits your caseload and legal strategy needs.
                </p>
              </div>
              <button
                onClick={closeBillingModal}
                className="text-zinc-400 hover:text-zinc-100 p-2 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {billingError && (
              <div className="mx-6 mt-4 p-3 bg-amber-950/30 border border-amber-500/40 rounded-lg text-xs font-mono text-amber-300">
                {billingError}
              </div>
            )}

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
                  const isCurrent = userPlan === plan.id;
                  const isElite = plan.id === 'elite';
                  return (
                    <div
                      key={plan.id}
                      className={cn(
                        "planCard rounded-xl p-5 flex flex-col justify-between border transition-all duration-200 relative",
                        isElite
                          ? "bg-gradient-to-b from-orange-950/30 to-zinc-900/90 border-orange-500/60 shadow-lg shadow-orange-950/20 ring-1 ring-orange-500/30"
                          : "bg-zinc-950/80 border-zinc-800 hover:border-zinc-700"
                      )}
                    >
                      {isElite && (
                        <div className="absolute -top-2.5 right-3 bg-orange-600 text-[9px] font-mono uppercase tracking-widest text-white px-2 py-0.5 rounded-full font-bold shadow">
                          Most Popular
                        </div>
                      )}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-bold text-zinc-100">{plan.name}</h3>
                          {isCurrent && (
                            <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-orange-400 border border-zinc-700 font-bold">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-2xl font-extrabold text-white mb-4">
                          ${plan.price}/month
                        </p>

                        <div className="space-y-2 text-xs font-mono text-zinc-300 border-t border-zinc-850 pt-3 mb-6">
                          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                            <span>Cases:</span>
                            <span className="font-semibold text-zinc-200">
                              {plan.limits.cases === 'unlimited' ? 'Unlimited' : plan.limits.cases}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                            <span>Evidence items:</span>
                            <span className="font-semibold text-zinc-200">
                              {plan.limits.evidence === 'unlimited' ? 'Unlimited' : plan.limits.evidence}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                            <span>Case exports:</span>
                            <span className="font-semibold text-zinc-200">
                              {(plan.limits as any).exports === true || (plan.limits as any).exports === 'unlimited' 
                                ? 'Included' 
                                : `${(plan.limits as any).exports}/mo`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                            <span>Litigation Engine:</span>
                            <span className={cn("font-semibold", (plan.limits as any).litigation_strategy ? "text-orange-400" : "text-zinc-600")}>
                              {(plan.limits as any).litigation_strategy ? 'Enabled' : 'Locked'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => startCheckout(plan.id)}
                        disabled={isCheckingOut === plan.id || isCurrent}
                        className={cn(
                          "w-full py-2.5 px-4 font-mono text-xs uppercase tracking-wider font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed",
                          isCurrent
                            ? "bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-default"
                            : isElite
                            ? "bg-orange-600 hover:bg-orange-500 text-white shadow-md hover:shadow-orange-600/30"
                            : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                        )}
                      >
                        {isCheckingOut === plan.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Processing...
                          </>
                        ) : isCurrent ? (
                          'Active Plan'
                        ) : (
                          'Select'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Simple Camera Icon component to prevent React errors
const CameraIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
    <circle cx="12" cy="13" r="3"/>
  </svg>
);
