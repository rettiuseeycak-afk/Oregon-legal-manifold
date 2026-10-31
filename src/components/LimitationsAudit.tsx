import React, { useState, useEffect, useMemo } from 'react';
import { Case, LegalClaim, Evidence } from '../types';
import { 
  evaluateAllCaseLimitations, 
  calculateClaimLimitations, 
  OREGON_STATUTE_RULES, 
  CaseLimitationsSummary, 
  ClaimLimitationResult 
} from '../lib/statuteOfLimitationsService';
import { 
  Clock, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Scale, 
  RefreshCw, 
  Sparkles, 
  FileText, 
  ChevronRight, 
  Filter, 
  FileDown, 
  Edit3, 
  Link as LinkIcon, 
  Info,
  Zap,
  ArrowUpRight,
  X,
  Brain,
  Layers,
  Check,
  Copy,
  ChevronDown,
  Eye,
  Activity,
  FileCheck,
  Search,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { generateContentProxy } from '../lib/geminiClient';
import { ThinkingIndicator } from './ThinkingIndicator';

interface LimitationsAuditProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
  onNavigateToTab?: (tab: string) => void;
  isDashboardEmbedded?: boolean;
}

export const LimitationsAudit: React.FC<LimitationsAuditProps> = ({
  activeCase,
  onUpdateCase,
  onNavigateToTab,
  isDashboardEmbedded = false
}) => {
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'TIME_BARRED' | 'CRITICAL' | 'WARNING' | 'SAFE' | 'MISSING_DATE'>('ALL');
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<Record<string, string>>({});
  const [editingClaimDate, setEditingClaimDate] = useState<{ id: string; date: string; years?: number } | null>(null);
  const [lastAutoRunTime, setLastAutoRunTime] = useState<string>(new Date().toLocaleTimeString());
  const [isResearchingPrecedents, setIsResearchingPrecedents] = useState<string | null>(null);
  const [researchResultsMap, setResearchResultsMap] = useState<Record<string, any[]>>({});

  // Automated Statute of Limitations Checker with Internalized CoT State
  const [isRunningAutomatedChecker, setIsRunningAutomatedChecker] = useState(false);
  const [checkerProgressStep, setCheckerProgressStep] = useState<string>('');
  const [checkerError, setCheckerError] = useState<string | null>(null);
  const [activeCoTClaimId, setActiveCoTClaimId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'STANDARD_MATRIX' | 'COT_AUDIT_REPORT'>('STANDARD_MATRIX');
  const [copiedReport, setCopiedReport] = useState(false);

  // Fallback / background evaluator
  const standardSummary: CaseLimitationsSummary = useMemo(() => {
    return evaluateAllCaseLimitations(activeCase);
  }, [activeCase.claims, activeCase.evidence]);

  const auditReport = activeCase.limitationsAuditReport;

  useEffect(() => {
    setLastAutoRunTime(new Date().toLocaleTimeString());
  }, [activeCase.claims, activeCase.evidence]);

  // Handler for Automated Statute of Limitations Checker with Internalized Chain of Thought
  const handleRunAutomatedLimitationsChecker = async () => {
    setIsRunningAutomatedChecker(true);
    setCheckerError(null);
    setCheckerProgressStep('Cross-verifying evidence manifold timestamps with case claims...');

    const stepTimer1 = setTimeout(() => {
      setCheckerProgressStep('Evaluating Oregon discovery rule & accrual standards (ORS 12.110, ORS 12.080)...');
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setCheckerProgressStep('Auditing tolling exceptions, OTCA 180-day notices, and continuous tort doctrines...');
    }, 2400);

    const stepTimer3 = setTimeout(() => {
      setCheckerProgressStep('Executing Internalized Chain of Thought statutory deadline calculations...');
    }, 3800);

    try {
      const response = await fetch('/api/limitations/checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeCase,
          referenceDate: new Date().toISOString().split('T')[0]
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || `Server responded with code ${response.status}`);
      }

      const report = await response.json();

      // Save report in active case
      onUpdateCase({
        ...activeCase,
        limitationsAuditReport: report
      });

      setViewMode('COT_AUDIT_REPORT');
      if (report.verifiedClaims && report.verifiedClaims.length > 0) {
        setActiveCoTClaimId(report.verifiedClaims[0].claimId);
      }
    } catch (err: any) {
      console.error("[LIMITATIONS CHECKER] Automated check error:", err);
      setCheckerError(err.message || 'Automated Statute of Limitations Verification failed.');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setIsRunningAutomatedChecker(false);
      setCheckerProgressStep('');
    }
  };

  // Handler for AI Precedent Research validating statute of limitations
  const handleSearchStatutePrecedents = async (result: ClaimLimitationResult) => {
    setIsResearchingPrecedents(result.claimId);

    const searchQuery = `Statute of limitations accrual discovery rule tolling precedents ${result.claimTitle} ORS ${result.matchedRule.orsCitation}`;
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          precedentsContext: []
        })
      });

      if (!response.ok) {
        throw new Error(`Research request failed with code ${response.status}`);
      }

      const data = await response.json();
      const findings = data.findings || [];

      setResearchResultsMap(prev => ({
        ...prev,
        [result.claimId]: findings
      }));

      // Automatically attach findings to the claim in activeCase
      const updatedClaims = activeCase.claims.map(c => {
        if (c.id === result.claimId) {
          return {
            ...c,
            validatedPrecedents: findings.map((f: any) => ({
              title: f.title,
              snippet: f.snippet,
              url: f.url,
              sourceType: f.sourceType || 'CASE_LAW',
              relevance: f.relevance || 90,
              validatedAt: new Date().toISOString()
            }))
          };
        }
        return c;
      });

      onUpdateCase({
        ...activeCase,
        claims: updatedClaims
      });

    } catch (err: any) {
      console.error("Statute precedent search error:", err);
    } finally {
      setIsResearchingPrecedents(null);
    }
  };

  // Filtered results logic
  const filteredStandardResults = useMemo(() => {
    if (filterRisk === 'ALL') return standardSummary.results;
    if (filterRisk === 'TIME_BARRED') {
      return standardSummary.results.filter(r => r.riskLevel === 'EXPIRED');
    }
    if (filterRisk === 'CRITICAL') {
      return standardSummary.results.filter(r => r.riskLevel === 'CRITICAL');
    }
    if (filterRisk === 'WARNING') {
      return standardSummary.results.filter(r => r.riskLevel === 'WARNING');
    }
    if (filterRisk === 'SAFE') {
      return standardSummary.results.filter(r => r.riskLevel === 'SAFE');
    }
    if (filterRisk === 'MISSING_DATE') {
      return standardSummary.results.filter(r => r.riskLevel === 'MISSING_DATE');
    }
    return standardSummary.results;
  }, [standardSummary, filterRisk]);

  const filteredCotResults = useMemo(() => {
    if (!auditReport || !auditReport.verifiedClaims) return [];
    if (filterRisk === 'ALL') return auditReport.verifiedClaims;
    if (filterRisk === 'TIME_BARRED') {
      return auditReport.verifiedClaims.filter(c => c.isTimeBarred || c.riskLevel === 'TIME_BARRED');
    }
    if (filterRisk === 'CRITICAL') {
      return auditReport.verifiedClaims.filter(c => c.riskLevel === 'CRITICAL');
    }
    if (filterRisk === 'WARNING') {
      return auditReport.verifiedClaims.filter(c => c.riskLevel === 'WARNING');
    }
    if (filterRisk === 'SAFE') {
      return auditReport.verifiedClaims.filter(c => c.riskLevel === 'TIMELY');
    }
    if (filterRisk === 'MISSING_DATE') {
      return auditReport.verifiedClaims.filter(c => c.riskLevel === 'INDETERMINATE');
    }
    return auditReport.verifiedClaims;
  }, [auditReport, filterRisk]);

  // Handle explicit cause of action date update
  const handleSaveClaimDate = (claimId: string, causeOfActionDate: string, limitationYears?: number) => {
    const updatedClaims = activeCase.claims.map(c => {
      if (c.id === claimId) {
        return {
          ...c,
          causeOfActionDate: causeOfActionDate || undefined,
          limitationYears: limitationYears || c.limitationYears
        };
      }
      return c;
    });

    onUpdateCase({
      ...activeCase,
      claims: updatedClaims
    });

    setEditingClaimDate(null);
  };

  // Run AI deep statutory analysis on a single claim
  const handleRunAiAnalysis = async (result: ClaimLimitationResult) => {
    setIsAiAnalyzing(result.claimId);
    
    const prompt = `You are a Senior Oregon Civil Litigation Attorney and Appellate Statute Specialist.
Analyze the Statute of Limitations profile for the following legal claim in an active Oregon trial:

CLAIM TITLE: "${result.claimTitle}"
CLAIM DESCRIPTION: "${result.claimDescription}"
JURISDICTION: "${activeCase.jurisdiction || 'Oregon Circuit Court'}"
IDENTIFIED ORS CITATION: "${result.matchedRule.orsCitation}" (${result.matchedRule.title})
CAUSE OF ACTION DATE: ${result.causeOfActionDate || 'Unspecified'} (Source: ${result.dateSource})
CALCULATED EXPIRATION DATE: ${result.expirationDate || 'N/A'}
DAYS REMAINING: ${result.daysRemaining !== null ? result.daysRemaining : 'Unknown'}
CURRENT RISK LEVEL: ${result.riskLevel}

Provide a deep, authoritative statutory limitation analysis in Markdown format:
1. **Accrual Analysis & Discovery Rule Applicability**: Examine when the cause of action accrued under Oregon law (e.g. ORS 12.110(1) discovery rule, actual vs inquiry notice).
2. **Equitable Tolling & Statutory Suspension**: Identify potential tolling mechanisms under Oregon Revised Statutes (e.g. ORS 12.160 for minority/disability, fraudulent concealment, continuous representation).
3. **Procedural Requirements & Pre-Suit Notice**: Outline required notices (e.g., ORS 30.275 180-day Oregon Tort Claims Act notice if public body involved, UTCR/ORCP filing deadlines).
4. **Actionable Counsel Directives**: Concrete next steps for trial counsel (e.g. filing urgency, tolling agreements, pleading allegations).`;

    try {
      const res = await generateContentProxy({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      setAiAnalysisResult(prev => ({
        ...prev,
        [result.claimId]: res.text || 'No response generated.'
      }));
    } catch (err: any) {
      console.error(err);
      setAiAnalysisResult(prev => ({
        ...prev,
        [result.claimId]: `Error performing analysis: ${err.message || 'Network error'}`
      }));
    } finally {
      setIsAiAnalyzing(null);
    }
  };

  // Copy full audit brief to clipboard
  const handleCopyAuditBrief = () => {
    if (!auditReport) return;
    const briefLines = [
      `# OREGON STATUTE OF LIMITATIONS & EVIDENCE MANIFOLD AUDIT REPORT`,
      `**Case Name:** ${activeCase.name}`,
      `**Jurisdiction:** ${activeCase.jurisdiction || 'Oregon State / Multnomah County'}`,
      `**Verification Timestamp:** ${auditReport.checkedAt}`,
      `**Executive Summary:** ${auditReport.summary.executiveSummary}`,
      `**Overall Status:** ${auditReport.summary.overallStatus}`,
      `**Total Claims Checked:** ${auditReport.summary.totalClaims} | **Time-Barred:** ${auditReport.summary.timeBarredCount} | **Critical (<60d):** ${auditReport.summary.criticalCount} | **Warning (<180d):** ${auditReport.summary.warningCount} | **Timely:** ${auditReport.summary.timelyCount}`,
      `\n---`,
      `## CLAIM-BY-CLAIM VERIFICATION DETAILS\n`
    ];

    auditReport.verifiedClaims.forEach((claim, idx) => {
      briefLines.push(`### ${idx + 1}. ${claim.claimTitle}`);
      briefLines.push(`- **Time-Barred Status:** ${claim.isTimeBarred ? '⚠️ TIME-BARRED / EXPIRED' : '✅ TIMELY'}`);
      briefLines.push(`- **Risk Level:** ${claim.riskLevel}`);
      briefLines.push(`- **Matched Statute:** ${claim.matchedStatute} (${claim.statuteDurationYears} Year Limitation Period)`);
      briefLines.push(`- **Accrual Date:** ${claim.accrualDate} (${claim.accrualRationale})`);
      briefLines.push(`- **Statutory Deadline:** ${claim.statutoryDeadline} (${claim.daysRemainingOrOverdue < 0 ? `${Math.abs(claim.daysRemainingOrOverdue)} days overdue` : `${claim.daysRemainingOrOverdue} days remaining`})`);
      briefLines.push(`- **Discovery Rule Applicable:** ${claim.discoveryRuleApplicable ? 'Yes' : 'No'} - ${claim.discoveryRuleDetails}`);
      briefLines.push(`- **Tolling Analysis:** ${claim.tollingAnalysis}`);
      briefLines.push(`\n**Internalized Chain of Thought Reasoning:**`);
      briefLines.push(`1. *Manifold Cross-Verification:* ${claim.internalizedChainOfThought.step1_manifold_cross_verification}`);
      briefLines.push(`2. *Accrual Determination:* ${claim.internalizedChainOfThought.step2_accrual_determination}`);
      briefLines.push(`3. *Statutory & Tolling Check:* ${claim.internalizedChainOfThought.step3_statutory_and_tolling_check}`);
      briefLines.push(`4. *Time-Bar Calculation:* ${claim.internalizedChainOfThought.step4_time_bar_calculation}`);
      briefLines.push(`5. *Defenses & Remedies:* ${claim.internalizedChainOfThought.step5_defense_and_remedies}`);
      briefLines.push(`\n**Recommended Action:** ${claim.recommendedAction}\n`);
    });

    navigator.clipboard.writeText(briefLines.join('\n'));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  // Download export report
  const handleExportLimitationsReport = () => {
    const reportData = {
      caseName: activeCase.name,
      jurisdiction: activeCase.jurisdiction,
      evaluationTimestamp: new Date().toISOString(),
      automatedAuditReport: auditReport || null,
      summaryTelemetry: {
        totalClaims: standardSummary.totalClaimsCount,
        expired: standardSummary.expiredCount,
        critical: standardSummary.criticalCount,
        warning: standardSummary.warningCount,
        safe: standardSummary.safeCount,
        missingDate: standardSummary.missingDateCount,
        overallRiskLevel: standardSummary.overallRiskLevel
      },
      claimAuditDetails: standardSummary.results.map(r => ({
        claimId: r.claimId,
        title: r.claimTitle,
        orsCitation: r.matchedRule.orsCitation,
        orsCategory: r.matchedRule.title,
        causeOfActionDate: r.causeOfActionDate,
        dateSource: r.dateSource,
        expirationDate: r.expirationDate,
        daysRemaining: r.daysRemaining,
        riskLevel: r.riskLevel,
        recommendedAction: r.recommendedAction
      }))
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(reportData, null, 2))}`;
    const anchor = document.createElement('a');
    anchor.setAttribute("href", jsonString);
    anchor.setAttribute("download", `Oregon_Statute_Of_Limitations_Audit_${activeCase.id || 'case'}.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const totalTimeBarred = auditReport 
    ? auditReport.summary.timeBarredCount 
    : standardSummary.expiredCount;

  const totalCritical = auditReport 
    ? auditReport.summary.criticalCount 
    : standardSummary.criticalCount;

  const totalWarning = auditReport 
    ? auditReport.summary.warningCount 
    : standardSummary.warningCount;

  const totalTimely = auditReport 
    ? auditReport.summary.timelyCount 
    : standardSummary.safeCount;

  return (
    <div className={cn("space-y-6 text-zinc-100", isDashboardEmbedded ? "p-0" : "p-6 bg-zinc-950 border border-zinc-850 rounded-xl")}>
      
      {/* 1. Header & Automated Checker Trigger Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg border border-amber-500/40">
              <Scale className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-serif italic font-bold text-zinc-100">
                  Automated Statute of Limitations Checker
                </h2>
                <span className="text-[9px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                  <Brain className="w-3 h-3 text-amber-400" />
                  Internalized Chain of Thought
                </span>
                <span className="text-[9px] font-mono uppercase bg-green-500/10 text-green-400 border border-green-500/30 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                  Evidence Manifold Live
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-400 mt-1">
                Cross-verifying <span className="text-zinc-200 font-bold">{activeCase.evidence?.length || 0} Evidence Documents</span> against <span className="text-zinc-200 font-bold">{activeCase.claims?.length || 0} Legal Claims</span> for statutory bar exposure under Oregon Law.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRunAutomatedLimitationsChecker}
            disabled={isRunningAutomatedChecker || !activeCase.claims || activeCase.claims.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-mono text-xs font-bold uppercase rounded-lg shadow-lg shadow-orange-950/40 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Execute internalized Chain-of-Thought cross-verification on all evidence and claims"
          >
            {isRunningAutomatedChecker ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Verifying Manifold Dates...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-200 animate-pulse" />
                <span>Run Automated Checker</span>
              </>
            )}
          </button>

          {auditReport && (
            <button
              onClick={handleCopyAuditBrief}
              className="px-3 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-zinc-100 font-mono text-xs rounded-lg transition-all flex items-center gap-1.5 font-bold cursor-pointer"
              title="Copy complete legal audit brief to clipboard"
            >
              {copiedReport ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400">Brief Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Copy Audit Brief</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleExportLimitationsReport}
            className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-all cursor-pointer"
            title="Export JSON Audit Report"
          >
            <FileDown className="w-4 h-4 text-zinc-300" />
          </button>
        </div>
      </div>

      {/* Thinking Indicator when automated CoT check is running */}
      {isRunningAutomatedChecker && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-3"
        >
          <ThinkingIndicator
            isThinking={true}
            curvature={0.94}
            sweBench={86.4}
            hleScore={51.2}
            entropyScore={0.12}
          />
          <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-lg text-center">
            <p className="text-xs font-mono text-amber-300 flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
              {checkerProgressStep || "Cross-verifying evidence manifold timestamps with statutory windows..."}
            </p>
          </div>
        </motion.div>
      )}

      {/* Error alert if automated check failed */}
      {checkerError && (
        <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-lg flex items-start gap-3 text-red-300 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold uppercase">Checker Notice: </span>
            {checkerError}
          </div>
          <button onClick={() => setCheckerError(null)} className="text-red-400 hover:text-red-200 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Top Urgent Banner if Time-Barred or Critical Claims exist */}
      {(totalTimeBarred > 0 || totalCritical > 0) && (
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-gradient-to-r from-red-950/60 via-red-900/30 to-zinc-950 border-2 border-red-500/70 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl shadow-red-950/50"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-red-500/20 rounded-lg border border-red-500/50 shrink-0 mt-0.5">
              <ShieldAlert className="w-6 h-6 text-red-400 animate-bounce" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h4 className="text-xs font-mono font-bold text-red-200 uppercase tracking-wider flex items-center gap-2">
                  <span>🚨 TIME-BARRED / CRITICAL LIMITATIONS ALERT</span>
                </h4>
                <span className="px-2.5 py-0.5 bg-red-500 text-zinc-950 font-mono font-extrabold text-[10px] rounded-full uppercase">
                  {totalTimeBarred + totalCritical} ACTION REQUIRED
                </span>
              </div>
              <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                {totalTimeBarred > 0 && (
                  <strong className="text-red-300 font-mono font-bold">{totalTimeBarred} claim(s) are TIME-BARRED under Oregon law. </strong>
                )}
                {totalCritical > 0 && (
                  <strong className="text-amber-300 font-mono font-bold">{totalCritical} claim(s) expire in LESS THAN 60 DAYS. </strong>
                )}
                Review the Internalized Chain of Thought below for equitable tolling, discovery rule pleadings, or relation-back amendments under ORCP 23 C.
              </p>
            </div>
          </div>
          {onNavigateToTab && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onNavigateToTab('generator')}
                className="px-3.5 py-2 bg-red-500 hover:bg-red-400 text-zinc-950 font-mono font-bold text-[10px] uppercase rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow"
              >
                Draft MSJ Opposition / Defense <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* 3. Executive Summary Card (if automated report exists) */}
      {auditReport && (
        <div className="p-4 bg-zinc-900/60 border border-amber-500/30 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                Internalized Chain of Thought Executive Verification
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              Verified on: <strong className="text-zinc-200">{new Date(auditReport.checkedAt).toLocaleString()}</strong>
            </span>
          </div>
          <p className="text-xs text-zinc-200 font-sans leading-relaxed">
            {auditReport.summary.executiveSummary}
          </p>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
              <span>Overall Status:</span>
              <span className={cn(
                "px-2 py-0.5 rounded font-bold uppercase",
                auditReport.summary.overallStatus === 'TIME_BARRED_DETECTED' ? "bg-red-500/20 text-red-300 border border-red-500/40" :
                auditReport.summary.overallStatus === 'CRITICAL_ACTION_REQUIRED' ? "bg-orange-500/20 text-orange-300 border border-orange-500/40" :
                auditReport.summary.overallStatus === 'WARNING' ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" :
                "bg-green-500/20 text-green-300 border border-green-500/40"
              )}>
                {auditReport.summary.overallStatus.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setViewMode(viewMode === 'COT_AUDIT_REPORT' ? 'STANDARD_MATRIX' : 'COT_AUDIT_REPORT')}
                className="text-[10px] font-mono py-1 px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-all cursor-pointer font-bold flex items-center gap-1"
              >
                <Layers className="w-3 h-3 text-amber-400" />
                {viewMode === 'COT_AUDIT_REPORT' ? "Switch to Standard Matrix" : "View CoT Audit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Risk Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setFilterRisk('ALL')}
          className={cn(
            "p-3.5 rounded-lg border text-left transition-all cursor-pointer",
            filterRisk === 'ALL' ? "bg-amber-500/10 border-amber-500 text-amber-300" : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-300"
          )}
        >
          <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest block">Total Claims</span>
          <p className="text-xl font-serif font-bold italic mt-0.5 text-zinc-100">
            {activeCase.claims?.length || 0}
          </p>
        </button>

        <button
          onClick={() => setFilterRisk('TIME_BARRED')}
          className={cn(
            "p-3.5 rounded-lg border text-left transition-all cursor-pointer",
            filterRisk === 'TIME_BARRED' ? "bg-red-500/20 border-red-500 text-red-300" : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-300"
          )}
        >
          <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest block flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-red-400" /> Time-Barred
          </span>
          <p className="text-xl font-serif font-bold italic mt-0.5 text-red-400">
            {totalTimeBarred}
          </p>
        </button>

        <button
          onClick={() => setFilterRisk('CRITICAL')}
          className={cn(
            "p-3.5 rounded-lg border text-left transition-all cursor-pointer",
            filterRisk === 'CRITICAL' ? "bg-orange-500/20 border-orange-500 text-orange-300" : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-300"
          )}
        >
          <span className="text-[9px] font-mono text-orange-400 uppercase tracking-widest block flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-orange-400" /> Critical (&lt;60d)
          </span>
          <p className="text-xl font-serif font-bold italic mt-0.5 text-orange-400">
            {totalCritical}
          </p>
        </button>

        <button
          onClick={() => setFilterRisk('WARNING')}
          className={cn(
            "p-3.5 rounded-lg border text-left transition-all cursor-pointer",
            filterRisk === 'WARNING' ? "bg-amber-500/20 border-amber-500 text-amber-300" : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-300"
          )}
        >
          <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest block flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" /> Warning (&lt;180d)
          </span>
          <p className="text-xl font-serif font-bold italic mt-0.5 text-amber-400">
            {totalWarning}
          </p>
        </button>

        <button
          onClick={() => setFilterRisk('SAFE')}
          className={cn(
            "p-3.5 rounded-lg border text-left transition-all cursor-pointer",
            filterRisk === 'SAFE' ? "bg-green-500/20 border-green-500 text-green-300" : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-300"
          )}
        >
          <span className="text-[9px] font-mono text-green-400 uppercase tracking-widest block flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-400" /> Timely / Stable
          </span>
          <p className="text-xl font-serif font-bold italic mt-0.5 text-green-400">
            {totalTimely}
          </p>
        </button>

        <button
          onClick={() => setFilterRisk('MISSING_DATE')}
          className={cn(
            "p-3.5 rounded-lg border text-left transition-all cursor-pointer",
            filterRisk === 'MISSING_DATE' ? "bg-zinc-800 border-zinc-600 text-zinc-200" : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-400"
          )}
        >
          <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest block flex items-center gap-1">
            <Calendar className="w-3 h-3 text-zinc-400" /> Missing Date
          </span>
          <p className="text-xl font-serif font-bold italic mt-0.5 text-zinc-300">
            {standardSummary.missingDateCount}
          </p>
        </button>
      </div>

      {/* 5. Filter Bar & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-b border-zinc-850 py-3 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Filter By Risk:</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'TIME_BARRED', label: 'Time-Barred' },
              { id: 'CRITICAL', label: 'Critical (<60d)' },
              { id: 'WARNING', label: 'Warning (<180d)' },
              { id: 'SAFE', label: 'Timely' },
              { id: 'MISSING_DATE', label: 'Missing Dates' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterRisk(tab.id as any)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-mono rounded transition-all cursor-pointer uppercase font-bold",
                  filterRisk === tab.id ? "bg-amber-500 text-zinc-950" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {auditReport && (
            <div className="flex items-center bg-zinc-900 p-0.5 rounded border border-zinc-800 text-[10px] font-mono font-bold">
              <button
                onClick={() => setViewMode('COT_AUDIT_REPORT')}
                className={cn(
                  "px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1",
                  viewMode === 'COT_AUDIT_REPORT' ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Brain className="w-3 h-3" /> CoT Reasoning
              </button>
              <button
                onClick={() => setViewMode('STANDARD_MATRIX')}
                className={cn(
                  "px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1",
                  viewMode === 'STANDARD_MATRIX' ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Layers className="w-3 h-3" /> Standard Matrix
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 6. MAIN CONTENT AREA: Render either CoT Audit Report or Standard Matrix */}
      {viewMode === 'COT_AUDIT_REPORT' && auditReport ? (
        <div className="space-y-4">
          {filteredCotResults.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 space-y-3">
              <CheckCircle2 className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs font-mono text-zinc-400">
                No claims match the "{filterRisk}" risk filter criteria in the verified audit report.
              </p>
            </div>
          ) : (
            filteredCotResults.map((vClaim, idx) => {
              const isSelectedCoT = activeCoTClaimId === vClaim.claimId;

              return (
                <div
                  key={vClaim.claimId}
                  className={cn(
                    "rounded-xl border transition-all overflow-hidden space-y-4 p-5",
                    vClaim.isTimeBarred
                      ? "bg-red-950/20 border-red-500/60 shadow-lg shadow-red-950/40"
                      : vClaim.riskLevel === 'CRITICAL'
                      ? "bg-orange-950/20 border-orange-500/60 shadow-lg shadow-orange-950/30"
                      : vClaim.riskLevel === 'WARNING'
                      ? "bg-amber-950/15 border-amber-500/40"
                      : "bg-zinc-900/40 border-zinc-800"
                  )}
                >
                  {/* Top Bar: Title, Flag Badge, Statute */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-850 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-zinc-500 font-bold">#{idx + 1}</span>
                        <h3 className="text-sm font-serif font-bold text-zinc-100">{vClaim.claimTitle}</h3>
                        <span className="text-[10px] font-mono py-0.5 px-2 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded font-bold">
                          {vClaim.matchedStatute}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Flag Time-Barred Badge */}
                      {vClaim.isTimeBarred ? (
                        <span className="px-3 py-1 bg-red-600 text-white font-mono text-xs font-extrabold rounded uppercase tracking-wider flex items-center gap-1.5 animate-pulse shadow-md">
                          <ShieldAlert className="w-4 h-4" />
                          FLAG: TIME-BARRED
                        </span>
                      ) : (
                        <span className={cn(
                          "px-3 py-1 font-mono text-xs font-bold rounded uppercase tracking-wider flex items-center gap-1.5",
                          vClaim.riskLevel === 'CRITICAL' ? "bg-orange-500 text-zinc-950 animate-pulse" :
                          vClaim.riskLevel === 'WARNING' ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" :
                          "bg-green-500/20 text-green-300 border border-green-500/40"
                        )}>
                          {vClaim.riskLevel === 'CRITICAL' && <AlertTriangle className="w-3.5 h-3.5" />}
                          {vClaim.riskLevel === 'WARNING' && <Clock className="w-3.5 h-3.5" />}
                          {vClaim.riskLevel === 'TIMELY' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {vClaim.riskLevel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Accrual, Deadline & Cross-Match Badges */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-950/80 p-3.5 rounded-lg border border-zinc-850 text-xs font-mono">
                    <div className="space-y-1">
                      <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">Accrual Date & Reason</span>
                      <div className="flex items-center gap-1.5 text-zinc-200 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>{vClaim.accrualDate}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate" title={vClaim.accrualRationale}>
                        {vClaim.accrualRationale}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">Statutory Deadline</span>
                      <div className="flex items-center gap-1.5 font-bold">
                        <Scale className="w-3.5 h-3.5 text-orange-400" />
                        <span className={vClaim.daysRemainingOrOverdue < 0 ? "text-red-400" : "text-zinc-200"}>
                          {vClaim.statutoryDeadline}
                        </span>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold block",
                        vClaim.daysRemainingOrOverdue < 0 ? "text-red-400" : "text-amber-400"
                      )}>
                        {vClaim.daysRemainingOrOverdue < 0
                          ? `OVERDUE by ${Math.abs(vClaim.daysRemainingOrOverdue)} days`
                          : `${vClaim.daysRemainingOrOverdue} days remaining`}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">Evidence Manifold Matches</span>
                      <div className="flex items-center gap-1.5 text-zinc-200 font-bold">
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        <span>{vClaim.evidenceCrossMatches.length} Documents Mapped</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate">
                        {vClaim.evidenceCrossMatches.map(m => m.evidenceTitle).join(', ') || 'No linked documents'}
                      </p>
                    </div>
                  </div>

                  {/* Evidence Manifold Cross-Verification Mini-Table */}
                  {vClaim.evidenceCrossMatches && vClaim.evidenceCrossMatches.length > 0 && (
                    <div className="space-y-2 bg-zinc-950/60 p-3 rounded-lg border border-zinc-850">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                        Evidence Manifold Date Cross-References:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {vClaim.evidenceCrossMatches.map((match, mIdx) => (
                          <div key={mIdx} className="p-2 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono space-y-0.5">
                            <div className="flex items-center justify-between text-zinc-200 font-bold">
                              <span className="truncate">{match.evidenceTitle}</span>
                              <span className="text-amber-400 shrink-0 ml-1.5">{match.dateFound}</span>
                            </div>
                            <p className="text-[10px] text-zinc-400">{match.relevanceNote}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5-Step Internalized Chain of Thought Box */}
                  <div className="space-y-2 bg-zinc-950 p-4 rounded-lg border border-amber-500/30">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-amber-400 animate-pulse" />
                        <h4 className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                          Internalized Chain of Thought Verification Stages
                        </h4>
                      </div>
                      <button
                        onClick={() => setActiveCoTClaimId(isSelectedCoT ? null : vClaim.claimId)}
                        className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer flex items-center gap-1"
                      >
                        {isSelectedCoT ? "Collapse Reasoning" : "Expand All 5 Stages"}
                        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isSelectedCoT && "rotate-180")} />
                      </button>
                    </div>

                    <div className="space-y-3 pt-1">
                      {/* Step 1 */}
                      <div className="p-2.5 bg-zinc-900/70 border border-zinc-800 rounded">
                        <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block mb-1">
                          Phase 1: Evidence Manifold Fact Extraction & Date Cross-Check
                        </span>
                        <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                          {vClaim.internalizedChainOfThought.step1_manifold_cross_verification}
                        </p>
                      </div>

                      {/* Step 2 */}
                      <div className="p-2.5 bg-zinc-900/70 border border-zinc-800 rounded">
                        <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block mb-1">
                          Phase 2: Accrual & Discovery Rule Scrutiny
                        </span>
                        <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                          {vClaim.internalizedChainOfThought.step2_accrual_determination}
                        </p>
                      </div>

                      {/* Step 3 */}
                      <div className="p-2.5 bg-zinc-900/70 border border-zinc-800 rounded">
                        <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block mb-1">
                          Phase 3: Statutory Rule Mapping & Tolling Exceptions
                        </span>
                        <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                          {vClaim.internalizedChainOfThought.step3_statutory_and_tolling_check}
                        </p>
                      </div>

                      {isSelectedCoT && (
                        <>
                          {/* Step 4 */}
                          <div className="p-2.5 bg-zinc-900/70 border border-zinc-800 rounded">
                            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block mb-1">
                              Phase 4: Exact Time-Bar Arithmetic Verification
                            </span>
                            <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                              {vClaim.internalizedChainOfThought.step4_time_bar_calculation}
                            </p>
                          </div>

                          {/* Step 5 */}
                          <div className="p-2.5 bg-zinc-900/70 border border-zinc-800 rounded">
                            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block mb-1">
                              Phase 5: Defenses, Oppositions & Immediate Action Items
                            </span>
                            <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                              {vClaim.internalizedChainOfThought.step5_defense_and_remedies}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Recommendation and Action Box */}
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block">Counsel Recommendation:</span>
                        <p className="text-zinc-200">{vClaim.recommendedAction}</p>
                      </div>
                    </div>

                    {onNavigateToTab && (
                      <button
                        onClick={() => onNavigateToTab('generator')}
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded font-bold uppercase text-[10px] shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        Draft Court Brief <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Standard Matrix View */
        <div className="space-y-4">
          {filteredStandardResults.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 space-y-3">
              <CheckCircle2 className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs font-mono text-zinc-400">
                {standardSummary.totalClaimsCount === 0 
                  ? "No legal claims currently registered in this case manifold." 
                  : "No claims match the selected filter criteria."}
              </p>
              {standardSummary.totalClaimsCount === 0 && onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('claims')}
                  className="px-4 py-2 bg-amber-500 text-zinc-950 font-mono font-bold text-[10px] uppercase rounded hover:bg-amber-400 transition-all cursor-pointer"
                >
                  Add Claims in Claims Editor
                </button>
              )}
            </div>
          ) : (
            filteredStandardResults.map(result => {
              const isEditingThis = editingClaimDate?.id === result.claimId;
              const isExpandedAi = selectedClaimId === result.claimId;

              return (
                <div 
                  key={result.claimId}
                  className={cn(
                    "p-5 rounded-xl border transition-all space-y-4 relative overflow-hidden",
                    result.riskLevel === 'EXPIRED' ? "bg-red-950/20 border-red-500/60 shadow-lg shadow-red-950/30" :
                    result.riskLevel === 'CRITICAL' ? "bg-amber-950/20 border-orange-500/60 shadow-lg shadow-amber-950/30" :
                    result.riskLevel === 'WARNING' ? "bg-amber-900/10 border-amber-500/40" :
                    result.riskLevel === 'MISSING_DATE' ? "bg-zinc-900/40 border-zinc-800" :
                    "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  {/* Left accent bar */}
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5",
                    result.riskLevel === 'EXPIRED' ? "bg-red-500" :
                    result.riskLevel === 'CRITICAL' ? "bg-orange-500" :
                    result.riskLevel === 'WARNING' ? "bg-amber-500" :
                    result.riskLevel === 'MISSING_DATE' ? "bg-zinc-600" :
                    "bg-green-500"
                  )} />

                  {/* Top Row: Title, ORS Badge, Risk Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-serif font-bold text-zinc-100">{result.claimTitle}</h3>
                        <span className="text-[10px] font-mono py-0.5 px-2 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded font-bold">
                          {result.matchedRule.orsCitation}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-400 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded">
                          {result.matchedRule.title}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 line-clamp-2 font-sans">{result.claimDescription}</p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto">
                      {/* Risk Badge */}
                      <span className={cn(
                        "text-[10px] font-mono font-bold uppercase py-1 px-3 rounded flex items-center gap-1.5 shadow-sm",
                        result.riskLevel === 'EXPIRED' ? "bg-red-500 text-zinc-950 animate-pulse" :
                        result.riskLevel === 'CRITICAL' ? "bg-orange-500 text-zinc-950 animate-pulse" :
                        result.riskLevel === 'WARNING' ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" :
                        result.riskLevel === 'MISSING_DATE' ? "bg-zinc-800 text-zinc-400 border border-zinc-700" :
                        "bg-green-500/20 text-green-300 border border-green-500/40"
                      )}>
                        {result.riskLevel === 'EXPIRED' && <ShieldAlert className="w-3.5 h-3.5" />}
                        {result.riskLevel === 'CRITICAL' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {result.riskLevel === 'WARNING' && <Clock className="w-3.5 h-3.5" />}
                        {result.riskLevel === 'SAFE' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {result.riskLevel === 'MISSING_DATE' && <Calendar className="w-3.5 h-3.5" />}
                        {result.riskLevel === 'EXPIRED' ? 'STATUTE EXPIRED' :
                         result.riskLevel === 'CRITICAL' ? 'CRITICAL (<60 DAYS)' :
                         result.riskLevel === 'WARNING' ? 'WARNING (<180 DAYS)' :
                         result.riskLevel === 'MISSING_DATE' ? 'ACTION REQUIRED: SET DATE' :
                         'ON TRACK / STABLE'}
                      </span>
                    </div>
                  </div>

                  {/* Middle Grid: Cause Date, Expiration Date, Countdown Bar */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-950/80 p-3.5 rounded-lg border border-zinc-850 pl-3">
                    {/* Cause Date */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">Incident / Accrual Date</span>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-xs font-mono font-bold text-zinc-200">
                          {result.causeOfActionDate || 'Not specified'}
                        </span>
                      </div>
                      {result.dateSourceTitle && (
                        <span className="text-[9px] font-mono text-zinc-400 block truncate" title={result.dateSourceTitle}>
                          Source: {result.dateSourceTitle}
                        </span>
                      )}
                    </div>

                    {/* Expiration Date */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">Calculated Expiration</span>
                      <div className="flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span className="text-xs font-mono font-bold text-zinc-200">
                          {result.expirationDate || 'N/A'}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-400">
                          ({result.matchedRule.defaultYears}yr Statutory Window)
                        </span>
                      </div>
                      {result.statutoryNoticeDays && (
                        <span className="text-[9px] font-mono text-amber-400 block">
                          Pre-suit OTCA Notice Due: {result.noticeDueDate} ({result.noticeDaysRemaining}d)
                        </span>
                      )}
                    </div>

                    {/* Countdown Bar & Days Remaining */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Countdown Gauge</span>
                        <span className={cn(
                          "text-xs font-mono font-bold",
                          result.daysRemaining === null ? "text-zinc-500" :
                          result.daysRemaining <= 0 ? "text-red-400" :
                          result.daysRemaining <= 60 ? "text-orange-400" :
                          result.daysRemaining <= 180 ? "text-amber-400" :
                          "text-green-400"
                        )}>
                          {result.daysRemaining === null ? "N/A" :
                           result.daysRemaining <= 0 ? `EXPIRED (${Math.abs(result.daysRemaining)} days ago)` :
                           `${result.daysRemaining} days remaining`}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500 rounded-full",
                            result.daysRemaining === null ? "w-0 bg-zinc-700" :
                            result.daysRemaining <= 0 ? "w-full bg-red-500" :
                            result.daysRemaining <= 60 ? "w-[90%] bg-orange-500 animate-pulse" :
                            result.daysRemaining <= 180 ? "w-[65%] bg-amber-500" :
                            "w-[30%] bg-green-500"
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Banner */}
                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs font-mono flex items-start gap-2.5 text-zinc-300">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p>{result.recommendedAction}</p>
                      <p className="text-[10px] text-zinc-400">{result.matchedRule.description}</p>
                    </div>
                  </div>

                  {/* Interactive Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-850">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingClaimDate(isEditingThis ? null : { 
                          id: result.claimId, 
                          date: result.causeOfActionDate || new Date().toISOString().split('T')[0],
                          years: result.matchedRule.defaultYears
                        })}
                        className="text-[10px] font-mono py-1 px-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-zinc-100 rounded transition-all flex items-center gap-1.5 cursor-pointer font-bold"
                      >
                        <Edit3 className="w-3 h-3 text-amber-400" />
                        {isEditingThis ? "Close Date Editor" : "Edit Incident Date / Years"}
                      </button>

                      <button
                        onClick={() => handleRunAiAnalysis(result)}
                        disabled={isAiAnalyzing === result.claimId}
                        className="text-[10px] font-mono py-1 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded transition-all flex items-center gap-1.5 cursor-pointer font-bold disabled:opacity-50"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        {isAiAnalyzing === result.claimId ? "Analyzing ORS Code..." : "Run AI Deep Statutory Analysis"}
                      </button>

                      <button
                        onClick={() => handleSearchStatutePrecedents(result)}
                        disabled={isResearchingPrecedents === result.claimId}
                        className="text-[10px] font-mono py-1 px-2.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 rounded transition-all flex items-center gap-1.5 cursor-pointer font-bold disabled:opacity-50"
                      >
                        <Scale className="w-3 h-3 text-orange-400" />
                        {isResearchingPrecedents === result.claimId ? "Researching Precedents..." : "Research Statute Precedents"}
                      </button>
                    </div>

                    {onNavigateToTab && (
                      <button
                        onClick={() => onNavigateToTab('generator')}
                        className="text-[10px] font-mono py-1 px-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-all flex items-center gap-1 cursor-pointer"
                      >
                        Draft Complaint / Motion <ArrowUpRight className="w-3 h-3 text-orange-400" />
                      </button>
                    )}
                  </div>

                  {/* Inline Date Editor Modal/Panel */}
                  {isEditingThis && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 bg-zinc-950 border border-amber-500/40 rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-mono font-bold text-amber-400 uppercase">
                          Override Cause of Action Date & Limitation Window
                        </h4>
                        <button 
                          onClick={() => setEditingClaimDate(null)}
                          className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">
                            Cause of Action / Incident Date (YYYY-MM-DD):
                          </label>
                          <input 
                            type="date"
                            value={editingClaimDate.date}
                            onChange={e => setEditingClaimDate({ ...editingClaimDate, date: e.target.value })}
                            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2 text-xs font-mono rounded focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">
                            Statutory Limitation Period (Years):
                          </label>
                          <input 
                            type="number"
                            min={1}
                            max={20}
                            value={editingClaimDate.years || result.matchedRule.defaultYears}
                            onChange={e => setEditingClaimDate({ ...editingClaimDate, years: parseInt(e.target.value) || 2 })}
                            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 p-2 text-xs font-mono rounded focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setEditingClaimDate(null)}
                          className="px-3 py-1 bg-zinc-800 text-zinc-300 font-mono text-[10px] uppercase rounded hover:bg-zinc-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveClaimDate(editingClaimDate.id, editingClaimDate.date, editingClaimDate.years)}
                          className="px-4 py-1 bg-amber-500 text-zinc-950 font-mono font-bold text-[10px] uppercase rounded hover:bg-amber-400 transition-all cursor-pointer"
                        >
                          Save & Recalculate
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Inline AI Analysis Output */}
                  {aiAnalysisResult[result.claimId] && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-zinc-950/90 border border-amber-500/30 rounded-lg space-y-2 mt-3"
                    >
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" /> AI Deep Statutory Analysis Briefing
                        </span>
                        <button
                          onClick={() => setSelectedClaimId(isExpandedAi ? null : result.claimId)}
                          className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
                        >
                          {isExpandedAi ? "Collapse" : "Expand"}
                        </button>
                      </div>

                      <div className="text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 pr-1">
                        {aiAnalysisResult[result.claimId]}
                      </div>
                    </motion.div>
                  )}

                  {/* Validated Precedent Findings Display */}
                  {(() => {
                    const claimObj = activeCase.claims.find(c => c.id === result.claimId);
                    const precedents = researchResultsMap[result.claimId] || claimObj?.validatedPrecedents || [];
                    if (precedents.length === 0) return null;

                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-zinc-950/90 border border-orange-500/30 rounded-lg space-y-3 mt-3"
                      >
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                          <span className="text-xs font-mono font-bold text-orange-400 flex items-center gap-1.5">
                            <Scale className="w-3.5 h-3.5 text-orange-400" />
                            Validated Statute & Accrual Precedents ({precedents.length})
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500 uppercase">
                            Attached to Motion for Summary Judgment
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5">
                          {precedents.map((p, pIdx) => (
                            <div key={pIdx} className="p-2.5 bg-zinc-900/80 border border-zinc-800 rounded flex flex-col justify-between space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-mono font-bold text-zinc-100 flex items-center gap-1.5">
                                  <Sparkles className="w-3 h-3 text-orange-400" />
                                  {p.title}
                                </span>
                                <span className="text-[9px] font-mono px-2 py-0.5 bg-orange-500/10 text-orange-300 border border-orange-500/30 rounded font-bold">
                                  {p.sourceType || 'CASE_LAW'}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                                {p.snippet}
                              </p>
                              {p.url && (
                                <div className="pt-1 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                                  <span>Relevance: <strong className="text-zinc-300">{p.relevance}%</strong></span>
                                  <a href={p.url} target="_blank" rel="noreferrer" className="text-orange-400 hover:underline flex items-center gap-0.5">
                                    Official Record <LinkIcon className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })()}

                </div>
              );
            })
          )}
        </div>
      )}

    </div>
  );
};
