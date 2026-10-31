import React, { useState } from 'react';
import { Case, LegalClaim, Evidence, OregonLegalManifold } from '../types';
import { generateContentProxy } from '../lib/geminiClient';
import { 
  ShieldAlert, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Fingerprint,
  Gavel,
  Scale,
  FileWarning,
  Clock,
  Calendar,
  Anchor,
  Activity,
  Zap,
  Info,
  ChevronRight,
  Database,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';
import manifoldData from '../data/oregonLegalManifold.json';

const manifold = manifoldData as OregonLegalManifold;

enum Type {
  OBJECT = 'OBJECT',
  ARRAY = 'ARRAY',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
}

type AuditMode = 'VIOLATION' | 'LIMITATIONS' | 'EVIDENCE' | 'SYSTEMIC' | 'RECTIFICATION' | 'DERIVATION';

interface ElementMapping {
  name: string;
  supportingEvidence: string;
  evidenceIds: string[];
}

interface AuditFinding {
  id: string;
  category: string;
  title: string;
  sourceAuthority?: string;
  evidenceAnchor?: string;
  reasoning: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  remedy?: string;
  isExpired?: boolean;
  daysRemaining?: number;
  elements?: ElementMapping[];
  limitationsPeriod?: string;
  accrualDate?: string;
}

interface IntelligenceCenterProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
}

export const IntelligenceCenter: React.FC<IntelligenceCenterProps> = ({ activeCase, onUpdateCase }) => {
  const [activeMode, setActiveMode] = useState<AuditMode>('VIOLATION');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [proposedFilingDate, setProposedFilingDate] = useState<string>(
    activeCase.smallClaimsData?.filingDate || new Date().toISOString().split('T')[0]
  );

  const performAudit = async () => {
    setIsAnalyzing(true);
    setError(null);

    let prompt = '';
    let responseSchema: any = {};

    const baseContext = `
      CASE NAME: ${activeCase.name}
      JURISDICTION: ${activeCase.jurisdiction}
      EVIDENCE MANIFOLD: ${activeCase.evidence.map(e => `[ID: ${e.id}] ${e.title}: ${e.content}`).join('\n\n')}
      LEGAL CLAIMS: ${activeCase.claims.map(c => `- ${c.title}: ${c.description}`).join('\n')}
    `;

    if (activeMode === 'VIOLATION') {
      prompt = `
        TASK: Perform a deep-layer Violation Audit.
        OBJECTIVE: Pinpoint exact instances where the law was handled incorrectly.
        1. CIVIL RIGHTS: Discrimination, due process failures.
        2. PROCEDURAL: Violations of ORCP, UTCR, or SLR.
        3. STATUTORY: Incorrect ORS application.
        
        REQUIREMENTS:
        - Every finding MUST anchor to evidence [ID: X].
        - Cite specific legal authority.
        - CRITICAL: For 'Procedural', append specific ORCP/UTCR rule (e.g., ORCP 21 A).
      `;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          findings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                title: { type: Type.STRING },
                sourceAuthority: { type: Type.STRING },
                evidenceAnchor: { type: Type.STRING },
                reasoning: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
                remedy: { type: Type.STRING }
              },
              required: ["category", "title", "sourceAuthority", "evidenceAnchor", "reasoning", "severity", "remedy"]
            }
          }
        },
        required: ["findings"]
      };
    } else if (activeMode === 'LIMITATIONS') {
      prompt = `
        TASK: Cross-verify claims against Oregon Statute of Limitations (SOL).
        PROPOSED FILING DATE: ${proposedFilingDate}
        Identify Accrual Date from evidence and compare to period.
      `;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          findings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING, enum: ['SOL'] },
                title: { type: Type.STRING },
                sourceAuthority: { type: Type.STRING },
                reasoning: { type: Type.STRING },
                isExpired: { type: Type.BOOLEAN },
                daysRemaining: { type: Type.NUMBER },
                severity: { type: Type.STRING, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] }
              },
              required: ["category", "title", "sourceAuthority", "reasoning", "isExpired", "daysRemaining", "severity"]
            }
          }
        },
        required: ["findings"]
      };
    } else if (activeMode === 'DERIVATION') {
      prompt = `
        TASK: Generate a list of potential legal claims derived from the provided evidence.
        PROPOSED FILING DATE FOR STATUTE OF LIMITATIONS REFERENCE: ${proposedFilingDate}
        
        For each claim:
        1. Identify the relevant statutes / legal authority and the core elements under Oregon law.
        2. Suggest/explain how the provided evidence supports each element of the claim, referencing specific evidence IDs (e.g. ${activeCase.evidence.map(e => `[ID: ${e.id}]`).join(', ')}).
        3. Cross-verify the Statute of Limitations (SOL) for each claim against the provided dates. Find the accrual date of the claim from the evidence blocks. Compare the proposed filing date (${proposedFilingDate}) to the accrual date and the statute period.
        4. Calculate whether the claim is time-barred or timely, and the numeric days remaining or past the deadline.
        
        JSON STRUCTURE REQUIREMENTS:
        - Return the findings formatted as claims.
        - For category use 'CLAIM'.
        - Set isExpired to true if the proposed filing date is after the statute of limitations deadline (time-barred), and false if it is timely.
        - Set daysRemaining with the exact integer of days from the proposed filing date to the deadline. Use a negative integer for days past deadline if past.
        - Create the elements array representing the composite elements of the claim. Each element must contain name, supportingEvidence, and an array of matching evidenceIds (strings, e.g., ["EV-001"]).
        - Include severity (CRITICAL/HIGH/MEDIUM/LOW) reflecting the overall strength, value, and timeliness of the claim.
        - Include remedy specifying the suggested legal action, remedy, or calculated damages.
      `;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          findings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING, enum: ['CLAIM'] },
                title: { type: Type.STRING },
                sourceAuthority: { type: Type.STRING },
                reasoning: { type: Type.STRING },
                limitationsPeriod: { type: Type.STRING },
                accrualDate: { type: Type.STRING },
                isExpired: { type: Type.BOOLEAN },
                daysRemaining: { type: Type.INTEGER },
                severity: { type: Type.STRING, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
                remedy: { type: Type.STRING },
                elements: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      supportingEvidence: { type: Type.STRING },
                      evidenceIds: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      }
                    },
                    required: ["name", "supportingEvidence", "evidenceIds"]
                  }
                }
              },
              required: ["category", "title", "sourceAuthority", "reasoning", "limitationsPeriod", "accrualDate", "isExpired", "daysRemaining", "severity", "remedy", "elements"]
            }
          }
        },
        required: ["findings"]
      };
    } else if (activeMode === 'EVIDENCE') {
      prompt = `
        TASK: Audit the Evidence Manifold for integrity and admissibility gaps.
        Identify missing foundations or authentications.
      `;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          findings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                title: { type: Type.STRING },
                reasoning: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
                remedy: { type: Type.STRING }
              },
              required: ["category", "title", "reasoning", "severity", "remedy"]
            }
          }
        },
        required: ["findings"]
      };
    } else {
      // Default / Systemic
      prompt = `
        TASK: Perform a high-level systemic audit of the case manifold.
        Look for thematic inconsistencies or structural weaknesses.
      `;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          findings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                title: { type: Type.STRING },
                reasoning: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] }
              },
              required: ["category", "title", "reasoning", "severity"]
            }
          }
        },
        required: ["findings"]
      };
    }

    try {
      const selectedModel = 
        activeMode === 'VIOLATION' || activeMode === 'DERIVATION' || activeMode === 'SYSTEMIC'
          ? "gemini-3.1-pro-preview" 
          : "gemini-3.5-flash";

      const response = await generateContentProxy({
        model: selectedModel,
        contents: prompt + "\n\nCONTEXT:\n" + baseContext,
        config: {
          responseMimeType: "application/json",
          responseSchema
        },
      });

      const data = JSON.parse(response.text || '{"findings": []}');
      setFindings(data.findings.map((f: any) => ({ ...f, id: crypto.randomUUID() })));
    } catch (err: any) {
      setError(err.message || "Failed to perform audit.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const modes: { id: AuditMode; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'VIOLATION', label: 'Violation Audit', icon: <Fingerprint className="w-4 h-4" />, color: 'red' },
    { id: 'LIMITATIONS', label: 'SOL Audit', icon: <Clock className="w-4 h-4" />, color: 'orange' },
    { id: 'DERIVATION', label: 'Claim Derivation', icon: <Gavel className="w-4 h-4" />, color: 'amber' },
    { id: 'EVIDENCE', label: 'Evidence Audit', icon: <Anchor className="w-4 h-4" />, color: 'indigo' },
    { id: 'SYSTEMIC', label: 'Systemic Scan', icon: <Activity className="w-4 h-4" />, color: 'emerald' },
    { id: 'RECTIFICATION', label: 'Rectification', icon: <Zap className="w-4 h-4" />, color: 'amber' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-900 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-sm">
            <Scale className="w-6 h-6 text-zinc-400" />
          </div>
          <div>
            <h2 className="text-2xl font-serif italic text-zinc-100">Intelligence Center</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Multi-Manifold Reasoning Engine</span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/50 p-1 border border-zinc-800 rounded-sm">
          {modes.map(mode => (
            <button
              key={mode.id}
              onClick={() => {
                setActiveMode(mode.id);
                setFindings([]);
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest transition-all",
                activeMode === mode.id 
                  ? `bg-${mode.color}-600/10 text-${mode.color}-500 border border-${mode.color}-500/20 shadow-sm` 
                  : "text-zinc-600 hover:text-zinc-400"
              )}
            >
              {mode.icon}
              <span className="hidden lg:inline">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {(activeMode === 'LIMITATIONS' || activeMode === 'DERIVATION') && (
        <div className="flex justify-end">
          <div className="flex flex-col max-w-xs">
            <label className="text-[9px] font-mono text-zinc-500 uppercase mb-1">Proposed Filing Date</label>
            <input 
              type="date"
              value={proposedFilingDate}
              onChange={(e) => setProposedFilingDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-mono px-3 py-1.5 focus:outline-none focus:border-orange-500/50"
            />
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={performAudit}
          disabled={isAnalyzing}
          className="group relative px-10 py-3 bg-zinc-100 text-zinc-950 font-mono text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-white transition-all overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-2 relative z-10">
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
            Execute {activeMode} Analysis
          </div>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-900/30 text-red-500 text-[10px] font-mono flex items-center gap-3">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {findings.length === 0 && !isAnalyzing && (
          <div className="py-24 border border-dashed border-zinc-900 rounded-sm flex flex-col items-center justify-center text-zinc-800 space-y-4">
            <Database className="w-16 h-16 opacity-5" />
            <div className="text-center">
              <p className="text-[10px] font-mono uppercase tracking-[0.3em]">Manifold Waiting</p>
              <p className="text-[9px] mt-2 italic">Select analysis mode and execute to scan case data.</p>
            </div>
          </div>
        )}

        {isAnalyzing && (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-zinc-700 animate-spin" />
            <p className="text-[10px] font-mono text-zinc-700 uppercase animate-pulse tracking-widest">Constructing Reasoning Trace...</p>
          </div>
        )}

        {findings.map((finding) => (
          <div 
            key={finding.id} 
            className="group relative bg-zinc-900/50 border border-zinc-900 hover:border-zinc-800 p-5 rounded-sm transition-all"
          >
            <div className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 transition-all",
              finding.severity === 'CRITICAL' ? "bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]" :
              finding.severity === 'HIGH' ? "bg-orange-600" :
              finding.severity === 'MEDIUM' ? "bg-amber-600" : "bg-zinc-700"
            )} />

            <div className="ml-2 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-500 text-[8px] font-bold rounded uppercase tracking-widest border border-zinc-700">
                    {finding.category}
                  </span>
                  <h3 className="text-sm font-bold text-zinc-100 font-serif italic">{finding.title}</h3>
                </div>
                {finding.isExpired !== undefined && (
                   <span className={cn(
                    "px-2 py-0.5 text-[9px] font-mono font-bold uppercase border",
                    finding.isExpired ? "border-red-500/50 text-red-500 bg-red-500/5" : "border-green-500/50 text-green-500 bg-green-500/5"
                  )}>
                    {finding.isExpired ? 'TIME-BARRED' : 'TIMELY'}
                  </span>
                )}
                <span className={cn(
                  "text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded-sm border",
                  finding.severity === 'CRITICAL' ? "border-red-500/30 text-red-500" :
                  finding.severity === 'HIGH' ? "border-orange-500/30 text-orange-500" :
                  finding.severity === 'MEDIUM' ? "border-amber-500/30 text-amber-500" :
                  "border-zinc-700 text-zinc-500"
                )}>
                  {finding.severity}
                </span>
              </div>

              {activeMode !== 'DERIVATION' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      {finding.sourceAuthority && (
                        <div>
                          <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">Legal Authority</p>
                          <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-mono">
                            <Gavel className="w-3 h-3" />
                            {finding.sourceAuthority}
                          </div>
                        </div>
                      )}
                      {finding.evidenceAnchor && (
                        <div>
                          <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">Evidence Anchor</p>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                            <Search className="w-3 h-3" />
                            {finding.evidenceAnchor}
                          </div>
                        </div>
                      )}
                      {finding.daysRemaining !== undefined && (
                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                          <Clock className="w-3 h-3" />
                          {finding.daysRemaining < 0 
                            ? `${Math.abs(finding.daysRemaining)} days past statute limit` 
                            : `${finding.daysRemaining} days remaining`}
                        </div>
                      )}
                    </div>

                    <div>
                       <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">Reasoning Trace</p>
                       <p className="text-xs text-zinc-400 leading-relaxed italic border-l border-zinc-800 pl-4 py-1">
                         "{finding.reasoning}"
                       </p>
                    </div>
                  </div>

                  {finding.remedy && (
                    <div className="pt-4 border-t border-zinc-900 flex items-start gap-3">
                      <div className="p-1 px-1.5 bg-green-950/20 rounded-sm mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                      </div>
                      <div>
                        <p className="text-[8px] font-mono text-green-700 uppercase tracking-widest font-bold">Counter-Measure / Remedy</p>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{finding.remedy}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-zinc-950 border border-zinc-800/80 rounded-sm text-[11px]">
                    <div>
                      <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">Governing Statute / Authority</p>
                      <div className="flex items-center gap-2 text-indigo-400 font-mono font-bold">
                        <Gavel className="w-3.5 h-3.5" />
                        {finding.sourceAuthority || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">Accrual Date</p>
                      <div className="flex items-center gap-2 text-zinc-300 font-mono font-bold">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        {finding.accrualDate || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">Statute Period & Timing</p>
                      <div className="flex items-center gap-2 text-zinc-300 font-mono">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{finding.limitationsPeriod || 'N/A'}</span>
                        <span className={cn(
                          "ml-1 font-bold text-[9px]",
                          finding.daysRemaining !== undefined && finding.daysRemaining < 0 ? "text-red-500" : "text-green-500"
                        )}>
                          ({finding.daysRemaining !== undefined && finding.daysRemaining < 0 
                            ? `${Math.abs(finding.daysRemaining)} days past limit` 
                            : `${finding.daysRemaining} days remaining`})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">Core Legal Theory & Factual Accrual Reasoning</p>
                    <p className="text-xs text-zinc-400 leading-relaxed italic border-l border-zinc-800 pl-4 py-1.5">
                      "{finding.reasoning}"
                    </p>
                  </div>

                  {finding.elements && finding.elements.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[8px] font-mono text-orange-500 uppercase tracking-widest font-bold">Claim Elements & Supporting Evidence Mapping</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {finding.elements.map((el, index) => (
                          <div key={index} className="p-4 bg-zinc-950 border border-zinc-900 rounded-sm space-y-3">
                            <div className="flex items-start gap-2 justify-between">
                              <span className="text-[10px] font-bold text-zinc-300 font-mono uppercase tracking-tight flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 text-[9px] flex items-center justify-center font-mono">
                                  {index + 1}
                                </span>
                                {el.name}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed italic pl-5">
                              "{el.supportingEvidence}"
                            </p>
                            <div className="flex flex-wrap gap-1.5 pl-5">
                              {el.evidenceIds.map(eid => {
                                const ev = activeCase.evidence.find(item => item.id === eid);
                                return (
                                  <span
                                    key={eid}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-900 text-[8px] font-mono text-zinc-500 border border-zinc-800 rounded-sm"
                                  >
                                    <Search className="w-2.5 h-2.5 text-zinc-600" />
                                    {ev?.title || eid}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {finding.remedy && (
                    <div className="pt-4 border-t border-zinc-900 flex items-start gap-3">
                      <div className="p-1 px-1.5 bg-green-950/20 rounded-sm mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                      </div>
                      <div>
                        <p className="text-[8px] font-mono text-green-700 uppercase tracking-widest font-bold">Estimated Remedies / Demanded Actions</p>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{finding.remedy}</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-zinc-900 flex justify-end">
                    <button
                      onClick={() => {
                        const newId = `CL-${Date.now()}`;
                        const isAlreadyImported = activeCase.claims.some(
                          c => c.title === `${finding.title} [Derived]` || c.title === finding.title
                        );
                        if (isAlreadyImported) {
                          alert(`Claim "${finding.title}" is already present in your active case manifold list.`);
                          return;
                        }

                        // Create the claim object mapping
                        const formattedClaim: LegalClaim = {
                          id: newId,
                          title: `${finding.title} [Derived]`,
                          description: `${finding.reasoning}\n\nStatute: ${finding.sourceAuthority}\nSOL Period: ${finding.limitationsPeriod} (Accrual: ${finding.accrualDate})\n\nRequired Elements:\n${finding.elements?.map((e, idx) => `${idx + 1}. ${e.name}: ${e.supportingEvidence}`).join('\n')}`,
                          evidenceIds: finding.elements?.flatMap(e => e.evidenceIds || []) || []
                        };

                        // Add to case claims list
                        onUpdateCase({
                          ...activeCase,
                          claims: [...activeCase.claims, formattedClaim]
                        });
                        alert(`Successfully formulated and imported derived claim "${finding.title}" mapping elements to the specified evidence blocks!`);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-mono text-[9px] uppercase tracking-widest transition-all rounded-sm shadow-md"
                    >
                      <Plus className="w-3 h-3" />
                      Import & Add Claim to Case Theory
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-5 border border-zinc-900 bg-zinc-950/50 rounded-sm">
        <div className="flex items-start gap-4">
          <Info className="w-5 h-5 text-zinc-700 mt-1" />
          <p className="text-[10px] text-zinc-600 font-mono leading-relaxed">
            The Intelligence Center utilizes hyper-constrained Reasoning Manifolds to detect anomalies in case data. 
            Audits are deterministic and mapped to ORS/ORCP primitives. 
            All findings categorized as "CRITICAL" should trigger an immediate rethink of the legal strategy.
          </p>
        </div>
      </div>
    </div>
  );
};
