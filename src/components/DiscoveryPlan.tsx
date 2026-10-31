import React, { useState } from 'react';
import { 
  Compass, 
  Loader2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Download, 
  Copy, 
  Sparkles, 
  Layers, 
  FileText, 
  MessageSquare, 
  UserCheck, 
  CheckCircle, 
  BookOpen, 
  Filter, 
  ChevronDown, 
  Save 
} from 'lucide-react';
import { Case, DiscoveryItem } from '../types';
import { generateContentProxy } from '../lib/geminiClient';

interface DiscoveryPlanProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
}

enum SchemaType {
  OBJECT = 'OBJECT',
  ARRAY = 'ARRAY',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
}

export const DiscoveryPlan: React.FC<DiscoveryPlanProps> = ({ activeCase, onUpdateCase }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter States
  const [selectedToolFilter, setSelectedToolFilter] = useState<string>('all');
  const [selectedClaimFilter, setSelectedClaimFilter] = useState<string>('all');

  // Form States (for Create/Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  const [formToolType, setFormToolType] = useState<'interrogatory' | 'rfp' | 'rfa' | 'deposition' | 'other'>('interrogatory');
  const [formTargetParty, setFormTargetParty] = useState('');
  const [formInformationSought, setFormInformationSought] = useState('');
  const [formLegalBasis, setFormLegalBasis] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formStatus, setFormStatus] = useState<'Draft' | 'Issued' | 'Completed' | 'Objected'>('Draft');
  const [formClaimId, setFormClaimId] = useState<string>('');

  const items = activeCase.discoveryPlanItems || [];

  // Reset form helper
  const resetForm = () => {
    setEditingItemId(null);
    setFormToolType('interrogatory');
    setFormTargetParty('');
    setFormInformationSought('');
    setFormLegalBasis('');
    setFormPurpose('');
    setFormStatus('Draft');
    setFormClaimId(activeCase.claims[0]?.id || '');
    setIsFormOpen(false);
  };

  // Open Form for Adding
  const handleOpenAddForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  // Open Form for Editing
  const handleOpenEditForm = (item: DiscoveryItem) => {
    setEditingItemId(item.id);
    setFormToolType(item.toolType);
    setFormTargetParty(item.targetParty);
    setFormInformationSought(item.informationSought);
    setFormLegalBasis(item.legalBasis);
    setFormPurpose(item.purposeAndImpact);
    setFormStatus(item.status);
    setFormClaimId(item.supportedClaimId || '');
    setIsFormOpen(true);
  };

  // Save or Update Discovery Item
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTargetParty || !formInformationSought || !formLegalBasis || !formPurpose) {
      setError("Please fill out all required fields to register the discovery requirement.");
      return;
    }

    const updatedItems = [...items];

    if (editingItemId) {
      // Edit mode
      const idx = updatedItems.findIndex(i => i.id === editingItemId);
      if (idx !== -1) {
        updatedItems[idx] = {
          ...updatedItems[idx],
          toolType: formToolType,
          targetParty: formTargetParty,
          informationSought: formInformationSought,
          legalBasis: formLegalBasis,
          purposeAndImpact: formPurpose,
          status: formStatus,
          supportedClaimId: formClaimId || undefined,
        };
      }
    } else {
      // Create mode
      const newItem: DiscoveryItem = {
        id: `disc-${Math.random().toString(36).substring(2, 9)}`,
        toolType: formToolType,
        targetParty: formTargetParty,
        informationSought: formInformationSought,
        legalBasis: formLegalBasis,
        purposeAndImpact: formPurpose,
        status: formStatus,
        supportedClaimId: formClaimId || undefined,
      };
      updatedItems.push(newItem);
    }

    onUpdateCase({
      ...activeCase,
      discoveryPlanItems: updatedItems,
      updatedAt: new Date().toISOString()
    });

    setSuccess(editingItemId ? "Discovery requirement revised successfully." : "New discovery requirement added successfully.");
    resetForm();
    setTimeout(() => setSuccess(null), 3000);
  };

  // Delete Item
  const handleDeleteItem = (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this discovery requirement?");
    if (!confirmed) return;

    const updatedItems = items.filter(i => i.id !== id);
    onUpdateCase({
      ...activeCase,
      discoveryPlanItems: updatedItems,
      updatedAt: new Date().toISOString()
    });

    setSuccess("Discovery requirement removed.");
    setTimeout(() => setSuccess(null), 3000);
  };

  // Update Item Status Directly
  const handleStatusChange = (id: string, newStatus: 'Draft' | 'Issued' | 'Completed' | 'Objected') => {
    const updatedItems = items.map(i => i.id === id ? { ...i, status: newStatus } : i);
    onUpdateCase({
      ...activeCase,
      discoveryPlanItems: updatedItems,
      updatedAt: new Date().toISOString()
    });
  };

  // AI Generator utilizing generateContentProxy
  const handleAIGeneratePlan = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    const claimSummary = activeCase.claims.map((c, index) => 
      `Claim #${index + 1}: ID: "${c.id}", Title: "${c.title}"\nDescription: ${c.description}`
    ).join('\n\n');

    const evidenceSummary = activeCase.evidence.map((e, index) =>
      `Exhibit #${index + 1}: Title: "${e.title}", Type: "${e.type}"\nContent Summary/Snippet: ${e.summary || e.content.substring(0, 150)}`
    ).join('\n\n');

    const prompt = `You are an elite trial strategist and litigation architect. Create a comprehensive, tactical Discovery Plan matching court conventions for this lawsuit:

CASE MATTER: "${activeCase.name}"
JURISDICTION: ${activeCase.jurisdiction || 'Default Jurisdiction'}
GOVERNING RULES: ${activeCase.courtRules || 'Rules of Civil Procedure'}

LEGAL CLAIMS TO SUPPORT:
${claimSummary || 'No formal claims entered yet.'}

KNOWN EVIDENCE / EXHBITS:
${evidenceSummary || 'No evidence items recorded yet.'}

GOAL:
Produce exactly 8-12 highly effective discovery requests tailored to build leverage, unearth hidden communications, verify facts, support active claims, and counter potential defenses.

TYPES OF DISCOVERY TOOLS TO DISPATCH:
- 'interrogatory': Structured written questions to get admissions under oath (bypassing easy objections).
- 'rfp' (Request for Production): Demands for electronic data, internal guidelines, or material emails.
- 'rfa' (Request for Admission): Requests to confirm straightforward material facts to narrow trial focus.
- 'deposition': Outlines for verbal deposition questions targeted at specific roles or key witnesses.

For each item, specify:
1. "toolType": Must be one of: 'interrogatory', 'rfp', 'rfa', 'deposition', 'other'.
2. "targetParty": The specific adverse party, officer, custodian, or key witness (e.g. "Defendant's IT Custodian", "Adverse Party CEO").
3. "informationSought": Dense, professional legal wording of the specific question or documents requested.
4. "legalBasis": Rule-grounded or precedent authority basis (e.g. "Federal Rule of Civil Procedure 34", "ORCP 43", or relevant discovery case law in that jurisdiction).
5. "purposeAndImpact": Tactical trace explaining how this specific discovery item proves a required element of one of the active claims, or discredits an expected affirmative defense.
6. "supportedClaimId": Map this to the exact claim ID from the listed claims if possible (choose from: ${activeCase.claims.map(c => `"${c.id}"`).join(', ') || '""'}).

OUTPUT REQUIREMENTS:
Provide a JSON object containing a top-level "results" array. Maintain clean formatting.`;

    try {
      const response = await generateContentProxy({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              results: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    toolType: { type: SchemaType.STRING, enum: ['interrogatory', 'rfp', 'rfa', 'deposition', 'other'] },
                    targetParty: { type: SchemaType.STRING },
                    informationSought: { type: SchemaType.STRING },
                    legalBasis: { type: SchemaType.STRING },
                    purposeAndImpact: { type: SchemaType.STRING },
                    supportedClaimId: { type: SchemaType.STRING }
                  },
                  required: ['toolType', 'targetParty', 'informationSought', 'legalBasis', 'purposeAndImpact']
                }
              }
            },
            required: ['results']
          }
        }
      });

      if (!response.text) {
        throw new Error("No payload returned from the legal strategy gateway.");
      }

      const jsonResult = JSON.parse(response.text);
      const generatedRaw = jsonResult.results || [];

      // Convert generated list to full schema
      const mappedItems: DiscoveryItem[] = generatedRaw.map((item: any) => ({
        id: `disc-${Math.random().toString(36).substring(2, 9)}`,
        toolType: item.toolType as any,
        targetParty: item.targetParty || 'Opposing Party',
        informationSought: item.informationSought || '',
        legalBasis: item.legalBasis || 'Rules of Civil Procedure',
        purposeAndImpact: item.purposeAndImpact || '',
        status: 'Draft',
        supportedClaimId: item.supportedClaimId || undefined
      }));

      onUpdateCase({
        ...activeCase,
        discoveryPlanItems: [...items, ...mappedItems],
        updatedAt: new Date().toISOString()
      });

      setSuccess(`Successfully compiled and added ${mappedItems.length} AI-strategized Discovery requirements!`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during AI discovery formulation.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Export Plan to Clipboard or Local Archive
  const handleExportMarkdown = () => {
    if (items.length === 0) {
      alert("There are no discovery items to export.");
      return;
    }

    let markdown = `# DISCOVERY PLAN AND LITIGATION STRATEGY\n`;
    markdown += `**CASE MATTER:** ${activeCase.name}\n`;
    markdown += `**JURISDICTION:** ${activeCase.jurisdiction || 'Default'}\n`;
    markdown += `**GOVERNING LAWS & RULES:** ${activeCase.courtRules || 'Rules of Civil Procedure'}\n`;
    markdown += `**DATE EXPORTED:** ${new Date().toLocaleDateString()}\n\n`;
    markdown += `---\n\n`;

    const grouped: Record<string, DiscoveryItem[]> = {
      interrogatory: [],
      rfp: [],
      rfa: [],
      deposition: [],
      other: []
    };

    items.forEach(i => {
      if (grouped[i.toolType]) grouped[i.toolType].push(i);
    });

    const getToolLabel = (t: string) => {
      switch(t) {
        case 'interrogatory': return 'WRITTEN INTERROGATORIES';
        case 'rfp': return 'REQUESTS FOR PRODUCTION OF DOCUMENTS (RFP)';
        case 'rfa': return 'REQUESTS FOR ADMISSION (RFA)';
        case 'deposition': return 'DEPOSITION ORAL EXAMINATION OUTLINES';
        default: return 'OTHER DISCOVERY CHANNELS';
      }
    };

    Object.keys(grouped).forEach(key => {
      const groupItems = grouped[key];
      if (groupItems.length === 0) return;

      markdown += `## ${getToolLabel(key)}\n\n`;
      groupItems.forEach((item, index) => {
        const claimObj = activeCase.claims.find(c => c.id === item.supportedClaimId);
        markdown += `### Request #${index + 1}: Targeting ${item.targetParty}\n`;
        markdown += `- **Information/Action Sought:** ${item.informationSought}\n`;
        markdown += `- **Rule / Legal Basis:** ${item.legalBasis}\n`;
        markdown += `- **Strategic Objective:** ${item.purposeAndImpact}\n`;
        markdown += `- **Status:** ${item.status}\n`;
        if (claimObj) {
          markdown += `- **Supports Legal Claim:** ${claimObj.title}\n`;
        }
        markdown += `\n`;
      });
      markdown += `---\n\n`;
    });

    navigator.clipboard.writeText(markdown)
      .then(() => {
        alert("Discovery Plan markdown copied to clipboard successfully!");
      })
      .catch(err => {
        console.error("Clipboard copy failed:", err);
      });
  };

  // Filter items
  const filteredItems = items.filter(i => {
    const matchesTool = selectedToolFilter === 'all' || i.toolType === selectedToolFilter;
    const matchesClaim = selectedClaimFilter === 'all' || i.supportedClaimId === selectedClaimFilter;
    return matchesTool && matchesClaim;
  });

  const getToolIcon = (type: string) => {
    switch (type) {
      case 'interrogatory': return <MessageSquare className="w-4 h-4 text-orange-500" />;
      case 'rfp': return <FileText className="w-4 h-4 text-teal-400" />;
      case 'rfa': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'deposition': return <UserCheck className="w-4 h-4 text-purple-400" />;
      default: return <Layers className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getToolLabel = (type: string) => {
    switch (type) {
      case 'interrogatory': return 'Interrogatories';
      case 'rfp': return 'Request for Production';
      case 'rfa': return 'Request for Admission';
      case 'deposition': return 'Deposition Outline';
      default: return 'Other/Custom';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-zinc-900 border-zinc-800 text-zinc-400';
      case 'Issued': return 'bg-amber-950/30 border-amber-800/50 text-amber-400';
      case 'Completed': return 'bg-green-950/30 border-green-800/50 text-green-400';
      case 'Objected': return 'bg-red-950/30 border-red-800/50 text-red-400';
      default: return 'bg-zinc-900 border-zinc-800 text-zinc-400';
    }
  };

  // --- DISCOVERY STATS CALCULATIONS ---
  const totalCount = items.length;
  const draftCount = items.filter(i => i.status === 'Draft').length;
  const issuedCount = items.filter(i => i.status === 'Issued').length;
  const completedCount = items.filter(i => i.status === 'Completed').length;
  const objectedCount = items.filter(i => i.status === 'Objected').length;
  
  // Sent items are those Issued, Completed, or Objected
  const totalSentCount = issuedCount + completedCount + objectedCount;
  
  const sentCompletedPercent = totalSentCount > 0 
    ? Math.round((completedCount / totalSentCount) * 100) 
    : 0;

  const catTypes = [
    { id: 'interrogatory', label: 'Interrogatories', icon: getToolIcon('interrogatory'), color: 'text-orange-500', barBg: 'bg-orange-500' },
    { id: 'rfp', label: 'Requests for Production (RFP)', icon: getToolIcon('rfp'), color: 'text-teal-400', barBg: 'bg-teal-400' },
    { id: 'rfa', label: 'Requests for Admission (RFA)', icon: getToolIcon('rfa'), color: 'text-emerald-400', barBg: 'bg-emerald-400' },
    { id: 'deposition', label: 'Deposition Outlines', icon: getToolIcon('deposition'), color: 'text-purple-400', barBg: 'bg-purple-400' },
    { id: 'other', label: 'Other / Custom', icon: getToolIcon('other'), color: 'text-zinc-400', barBg: 'bg-zinc-500' }
  ];

  const categoryMetrics = catTypes.map(cat => {
    const catItems = items.filter(i => i.toolType === cat.id);
    const total = catItems.length;
    const draft = catItems.filter(i => i.status === 'Draft').length;
    const sent = catItems.filter(i => i.status === 'Issued').length; 
    const received = catItems.filter(i => i.status === 'Completed').length;
    const objected = catItems.filter(i => i.status === 'Objected').length;

    // Dispatched/Sent (Issued + Completed + Objected)
    const activeDispatched = sent + received + objected;

    const percent = activeDispatched > 0 
      ? Math.round((received / activeDispatched) * 100) 
      : 0;

    return {
      ...cat,
      total,
      draft,
      sent,
      received,
      objected,
      activeDispatched,
      percent
    };
  });

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-serif italic text-zinc-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-orange-500" />
            Litigation Discovery Plan & Strategy
          </h2>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
            Construct written interrogatories, requests for production, admissions, and depositions grounded in court rules
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={handleExportMarkdown}
              className="px-4 py-2 border border-zinc-850 text-[10px] font-mono text-zinc-400 uppercase tracking-widest hover:text-zinc-100 hover:border-zinc-650 transition-all flex items-center gap-2 bg-zinc-950 rounded-sm"
              title="Copy the entire strategy plan as structured Markdown report to clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Strategy Report
            </button>
          )}
          <button
            onClick={handleAIGeneratePlan}
            disabled={isGenerating}
            className="px-4 py-2 bg-orange-650 hover:bg-orange-500 text-white text-[10px] font-mono uppercase tracking-widest transition-colors flex items-center gap-2 rounded-sm cursor-pointer shadow-md shadow-orange-950/10"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Formulating Strategy...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                Generate Strategic Discovery
              </>
            )}
          </button>
          <button
            onClick={handleOpenAddForm}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300 hover:text-zinc-100 uppercase tracking-widest hover:border-zinc-600 transition-colors flex items-center gap-1.5 rounded-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Discovery Item
          </button>
        </div>
      </div>

      {/* SYSTEM FEEDBACKS */}
      {error && (
        <div className="p-4 bg-red-950/20 border border-red-900/40 text-red-400 text-xs font-mono flex items-start gap-3 rounded-md">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-950/20 border border-green-900/40 text-green-400 text-xs font-mono flex items-start gap-3 rounded-md animate-fade-in">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>{success}</div>
        </div>
      )}

      {/* DISCOVERY TRACKER & PROGRESS BARS */}
      {items.length > 0 && (
        <div className="bg-zinc-950 border border-zinc-850 rounded-lg p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-orange-500 animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-350 font-bold">
                Discovery Campaign Tracker
              </span>
            </div>
            <div className="text-[10px] font-mono text-zinc-550">
              REAL-TIME INSIGHTS
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Global Metric Summary */}
            <div className="lg:col-span-4 flex flex-col justify-between border-r border-zinc-900/60 pr-0 lg:pr-6 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wide block">
                  Overall Completion Rate (Received vs Sent)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-sans font-bold text-zinc-100 tracking-tight">
                    {sentCompletedPercent}%
                  </span>
                  <span className="text-xs font-mono text-zinc-500">
                    ({completedCount} of {totalSentCount} sent)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-850/50">
                  <div 
                    className="bg-gradient-to-r from-orange-650 to-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${sentCompletedPercent}%` }}
                  />
                </div>
              </div>

              {/* Status Breakdowns */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3.5 pt-2">
                <div className="bg-zinc-900/40 border border-zinc-900/60 p-2 rounded text-left">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Draft Items</span>
                  <span className="text-sm font-mono font-bold text-zinc-400">{draftCount}</span>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-900/60 p-2 rounded text-left">
                  <span className="text-[9px] font-mono text-orange-500/80 uppercase tracking-wider block">Sent (Issued)</span>
                  <span className="text-sm font-mono font-bold text-orange-400">{issuedCount}</span>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-900/60 p-2 rounded text-left">
                  <span className="text-[9px] font-mono text-emerald-500/80 uppercase tracking-wider block">Received (Completed)</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">{completedCount}</span>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-900/60 p-2 rounded text-left">
                  <span className="text-[9px] font-mono text-red-500/80 uppercase tracking-wider block">Objected</span>
                  <span className="text-sm font-mono font-bold text-red-400">{objectedCount}</span>
                </div>
              </div>
            </div>

            {/* Category Breakdown list */}
            <div className="lg:col-span-8 space-y-3">
              <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wide block mb-1">
                Category Status breakdown
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryMetrics.map(cat => {
                  return (
                    <div 
                      key={cat.id} 
                      className="bg-zinc-900/20 border border-zinc-900/80 p-3 rounded-md flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {cat.icon}
                          <span className="text-[11px] font-mono font-semibold text-zinc-300">
                            {cat.label}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {cat.total} total
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-zinc-450 text-[10px]">
                            {cat.received} Rec'd / {cat.activeDispatched} Sent
                          </span>
                          <span className={`${cat.color} font-bold`}>
                            {cat.percent}%
                          </span>
                        </div>
                        {/* Micro progress bar */}
                        <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-900">
                          <div 
                            className={`${cat.barBg} h-full rounded-full transition-all duration-500`}
                            style={{ width: `${cat.percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 border-t border-zinc-900/40 pt-1.5">
                        <span>Drafts: <strong className="text-zinc-400">{cat.draft}</strong></span>
                        <span>Issued: <strong className="text-orange-400/85">{cat.sent}</strong></span>
                        <span>Obj: <strong className="text-red-400/85">{cat.objected}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE FORM DRAWER / AREA */}
      {isFormOpen && (
        <div className="p-5 bg-zinc-950 border border-zinc-850 rounded-lg space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-1.5">
              {editingItemId ? <Edit2 className="w-3.5 h-3.5 text-orange-500" /> : <Plus className="w-3.5 h-3.5 text-green-500" />}
              {editingItemId ? 'Revise Discovery Demand' : 'Register New Discovery Demand'}
            </span>
            <button 
              onClick={resetForm}
              className="p-1 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveItem} className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs font-mono">
            {/* Column left */}
            <div className="md:col-span-4 space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase block">Discovery Tool Type</label>
                <select
                  value={formToolType}
                  onChange={(e) => setFormToolType(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-zinc-700 text-zinc-200 p-2 text-xs focus:outline-none"
                >
                  <option value="interrogatory">Interrogatories (Oaths)</option>
                  <option value="rfp">Request for Production (RFP)</option>
                  <option value="rfa">Request for Admission (RFA)</option>
                  <option value="deposition">Deposition Examination</option>
                  <option value="other">Other / Custom</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase block">Target Adverse Party/Role</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Defendant's Lead IT Engineer"
                  value={formTargetParty}
                  onChange={(e) => setFormTargetParty(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-zinc-700 text-zinc-200 p-2 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase block">Legal Basis / Rule Anchoring</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Federal Rule of Civil Procedure 34"
                  value={formLegalBasis}
                  onChange={(e) => setFormLegalBasis(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-zinc-700 text-zinc-200 p-2 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase block">Supported Legal Claim</label>
                <select
                  value={formClaimId}
                  onChange={(e) => setFormClaimId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-zinc-700 text-zinc-200 p-2 text-xs focus:outline-none"
                >
                  <option value="">-- No Direct Link --</option>
                  {activeCase.claims.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase block">Filing / Process Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-zinc-700 text-zinc-200 p-2 text-xs focus:outline-none"
                >
                  <option value="Draft">Draft Mode</option>
                  <option value="Issued">Issued / Sent</option>
                  <option value="Completed">Completed / Answer Received</option>
                  <option value="Objected">Objected / Disputed</option>
                </select>
              </div>
            </div>

            {/* Column right */}
            <div className="md:col-span-8 space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase block">Information Sought (Specific Demands)</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe with surgical precision what questions need to be answered or what specific electronic archives/records must be produced..."
                  value={formInformationSought}
                  onChange={(e) => setFormInformationSought(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-zinc-700 text-zinc-200 p-2 text-xs focus:outline-none font-sans min-h-[96px] leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase block">Strategic Purpose & Defense Defeat Assessment</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe how this proofs a material element of our complaint, or disproves/precludes expected defense theories..."
                  value={formPurpose}
                  onChange={(e) => setFormPurpose(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-zinc-700 text-zinc-200 p-2 text-xs focus:outline-none font-sans min-h-[96px] leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-zinc-850 hover:border-zinc-700 hover:text-zinc-300 text-zinc-500 rounded uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Requirement
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* FILTER CONTROLS */}
      <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-400">Tool Type:</span>
            <select
              value={selectedToolFilter}
              onChange={(e) => setSelectedToolFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 p-1.5 focus:outline-none focus:border-zinc-650 rounded-sm text-xs"
            >
              <option value="all">All Discovery Tools</option>
              <option value="interrogatory">Interrogatories</option>
              <option value="rfp">Request for Production (RFP)</option>
              <option value="rfa">Request for Admission (RFA)</option>
              <option value="deposition">Deposition Examination</option>
              <option value="other">Other/Custom</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Claim Mapping:</span>
            <select
              value={selectedClaimFilter}
              onChange={(e) => setSelectedClaimFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 p-1.5 focus:outline-none focus:border-zinc-650 rounded-sm text-xs max-w-xs"
            >
              <option value="all">All Active Claims</option>
              {activeCase.claims.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-[10px] font-mono text-zinc-500">
          Showing <span className="text-zinc-300 font-bold">{filteredItems.length}</span> of {items.length} strategy directives
        </div>
      </div>

      {/* DISCOVERY ITEMS LISTING */}
      {filteredItems.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-zinc-850 rounded-lg bg-zinc-950/20">
          <Compass className="w-8 h-8 text-zinc-750 mb-3 mx-auto animate-pulse" />
          <h3 className="text-sm font-mono text-zinc-400 uppercase tracking-widest mb-1.5">No Discovery Strategy Defined</h3>
          <p className="text-xs text-zinc-500 mb-6 max-w-sm mx-auto leading-relaxed">
            Use the "Generate Strategic Discovery" button to construct an automated baseline using Gemini, or add manual requests using the builder.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleAIGeneratePlan}
              disabled={isGenerating}
              className="px-5 py-2.5 bg-orange-650 hover:bg-orange-500 text-white font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-2 rounded-sm cursor-pointer shadow-md"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin text-orange-200" /> : <Sparkles className="w-4 h-4" />}
              Auto Strategic Discovery
            </button>
            <button
              onClick={handleOpenAddForm}
              className="px-5 py-2.5 border border-zinc-800 bg-zinc-900 hover:border-zinc-600 text-zinc-300 font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-1.5 rounded-sm"
            >
              <Plus className="w-4 h-4 text-green-500" /> Add Custom Directives
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item, index) => {
            const correspondingClaim = activeCase.claims.find(c => c.id === item.supportedClaimId);
            
            return (
              <div 
                key={item.id}
                className="bg-zinc-950 border border-zinc-850 hover:border-zinc-700 transition-all rounded-lg overflow-hidden flex flex-col md:grid md:grid-cols-12"
              >
                {/* Side Header (Type / Target) */}
                <div className="md:col-span-3 p-4 bg-zinc-900/40 border-r border-zinc-850/35 flex md:flex-col justify-between md:justify-start gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      {getToolIcon(item.toolType)}
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-zinc-350">
                        {getToolLabel(item.toolType)}
                      </span>
                    </div>

                    <h4 className="text-xs font-mono font-bold text-zinc-150 mb-1 leading-snug">
                      {item.targetParty}
                    </h4>

                    <div className="text-[9px] font-mono text-zinc-500 flex flex-col gap-1 mt-2">
                      <span className="line-clamp-2" title={item.legalBasis}>
                        RULE: {item.legalBasis}
                      </span>
                      {correspondingClaim && (
                        <span className="text-orange-500/80 line-clamp-2" title={correspondingClaim.title}>
                          CLAIM: {correspondingClaim.title}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex md:flex-col items-center md:items-start gap-2.5 md:mt-auto">
                    {/* Status inline selector */}
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value as any)}
                      className={`text-[9px] font-mono px-2 py-1 rounded border focus:outline-none ${getStatusBadgeClass(item.status)}`}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Issued">Issued</option>
                      <option value="Completed">Completed</option>
                      <option value="Objected">Objected</option>
                    </select>
                  </div>
                </div>

                {/* Content Area */}
                <div className="md:col-span-9 p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-semibold block">
                        Material Information & Fact Gathering Target
                      </span>
                      <p className="text-xs text-zinc-100 font-sans leading-relaxed whitespace-pre-wrap">
                        {item.informationSought}
                      </p>
                    </div>

                    <div className="space-y-1 bg-zinc-900/10 border border-zinc-900 p-3 rounded">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-semibold flex items-center gap-1 block">
                        <BookOpen className="w-3.5 h-3.5 text-zinc-650" /> Strategic Impact / Claim Linkage Trace
                      </span>
                      <p className="text-[11px] text-zinc-450 font-sans leading-relaxed">
                        {item.purposeAndImpact}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between border-t border-zinc-900 pt-3 text-[10px] font-mono text-zinc-550">
                    <span>ARCHIVE NODE REF: #{index + 1}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditForm(item)}
                        className="p-1.5 border border-zinc-850 hover:border-zinc-700 hover:text-zinc-150 text-zinc-400 rounded-sm flex items-center gap-1 transition-colors cursor-pointer"
                        title="Edit discovery requirement details"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 border border-zinc-850 hover:border-red-900 hover:text-red-400 text-zinc-450 rounded-sm flex items-center gap-1 transition-colors cursor-pointer"
                        title="Remove requirement"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
