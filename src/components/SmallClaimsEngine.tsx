import React, { useState } from 'react';
import { 
  Scale, 
  AlertCircle, 
  CheckCircle2, 
  Circle, 
  DollarSign, 
  FileText, 
  Send, 
  Users, 
  Clock, 
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Info,
  ExternalLink,
  Mail,
  UserCheck,
  MessageSquare,
  Gavel
} from 'lucide-react';
import { Case } from '../types';
import { cn } from '../lib/utils';

interface SmallClaimsEngineProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
}

export const SmallClaimsEngine: React.FC<SmallClaimsEngineProps> = ({ activeCase, onUpdateCase }) => {
  const [expandedPhase, setExpandedPhase] = useState<number>(1);

  const data = activeCase.smallClaimsData || {
    claimAmount: 0,
    demandLetterSent: false,
    isBusinessDefendant: false,
    feeWaiverRequested: false,
    jurisdictionBasis: 'Defendant Residence',
    responseReceived: false,
    mediationScheduled: false,
  };

  const updateData = (updates: Partial<typeof data>) => {
    onUpdateCase({
      ...activeCase,
      smallClaimsData: { ...data, ...updates } as any
    });
  };

  const calculateFee = (amount: number) => {
    if (amount <= 2500) return 53;
    if (amount <= 10000) return 105;
    return 0;
  };

  const phases = [
    {
      id: 1,
      title: "Phase 1: Pre-Filing Requirements",
      description: "Audit case for statutory prerequisites and resolve disputes before filing.",
      icon: ShieldCheck,
    },
    {
      id: 2,
      title: `Phase 2: Filing in ${activeCase.jurisdiction}`,
      description: `Submit formal documents and pay required fees to ${activeCase.jurisdiction} Circuit Court.`,
      icon: FileText,
    },
    {
      id: 3,
      title: "Phase 3: Service of Process",
      description: "Track the 63-day deadline for serving the defendant and filing proof.",
      icon: Send,
    },
    {
      id: 4,
      title: "Phase 4: 30-Day Response Window",
      description: "Monitor defendant response (HB 2463 update) and determine next steps.",
      icon: Clock,
    },
    {
      id: 5,
      title: `Phase 5: ${activeCase.jurisdiction} Mediation`,
      description: "Mandatory neutral meeting to settle before trial.",
      icon: MessageSquare,
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-900/20 rounded-full">
            <Scale className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-serif italic text-zinc-100">Small Claims Logic Engine</h2>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{activeCase.jurisdiction} Procedural Roadmap (2026 Edition)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-mono text-zinc-400">
          <Info className="w-3 h-3" />
          Oregon HB 2463 Compliant
        </div>
      </div>

      <div className="space-y-4">
        {phases.map((phase) => (
          <div 
            key={phase.id}
            className={cn(
              "border transition-all overflow-hidden",
              expandedPhase === phase.id ? "border-zinc-700 bg-zinc-900/50" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
            )}
          >
            <button 
              onClick={() => setExpandedPhase(expandedPhase === phase.id ? 0 : phase.id)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-2 rounded-sm transition-colors",
                  expandedPhase === phase.id ? "bg-orange-600 text-white" : "bg-zinc-900 text-zinc-600"
                )}>
                  <phase.icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={cn(
                    "text-xs font-mono uppercase tracking-widest",
                    expandedPhase === phase.id ? "text-zinc-100" : "text-zinc-400"
                  )}>
                    {phase.title}
                  </h3>
                  <p className="text-[10px] text-zinc-600 font-mono">{phase.description}</p>
                </div>
              </div>
              {expandedPhase === phase.id ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-700" />}
            </button>

            {expandedPhase === phase.id && (
              <div className="p-6 border-t border-zinc-800 bg-zinc-950/50 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                {phase.id === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="claim-amount" className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                          <DollarSign className="w-3 h-3" />
                          Claim Amount ($)
                        </label>
                        <input 
                          key={`claim-amount-${activeCase.id}`}
                          id="claim-amount"
                          type="number"
                          defaultValue={data.claimAmount}
                          onBlur={(e) => {
                            const val = Number(e.target.value);
                            if (val !== data.claimAmount) {
                              updateData({ claimAmount: val });
                            }
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 p-3 text-zinc-100 font-mono text-sm focus:outline-none focus:border-orange-500 transition-all"
                          placeholder="Enter amount..."
                        />
                        {data.claimAmount > 10000 && (
                          <p className="text-[10px] text-red-500 font-mono flex items-center gap-2">
                            <AlertCircle className="w-3 h-3" />
                            Warning: Small Claims limit is $10,000 in Oregon.
                          </p>
                        )}
                        {data.claimAmount > 750 && (
                          <p className="text-[10px] text-orange-500 font-mono flex items-center gap-2">
                            <Info className="w-3 h-3" />
                            Note: Over $750, defendant has constitutional right to jury trial.
                          </p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest">Bona Fide Effort</label>
                        <div 
                          onClick={() => updateData({ demandLetterSent: !data.demandLetterSent })}
                          className={cn(
                            "flex items-center justify-between p-3 border cursor-pointer transition-all",
                            data.demandLetterSent ? "bg-green-900/10 border-green-900/50" : "bg-zinc-900 border-zinc-800"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Mail className={cn("w-4 h-4", data.demandLetterSent ? "text-green-500" : "text-zinc-600")} />
                            <span className="text-[10px] font-mono uppercase text-zinc-300">Demand Letter Sent?</span>
                          </div>
                          {data.demandLetterSent ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-zinc-800" />}
                        </div>
                        {!data.demandLetterSent && (
                          <button className="w-full py-2 border border-dashed border-zinc-800 text-[9px] font-mono uppercase text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-all">
                            Generate Demand Letter Template
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-900/30 border border-zinc-800 space-y-3">
                      <h4 className="text-[10px] font-mono uppercase text-zinc-400 tracking-widest border-b border-zinc-800 pb-2">Statutory Prerequisites</h4>
                      <ul className="space-y-2">
                        <li className="text-[10px] text-zinc-500 flex items-start gap-2">
                          <CheckCircle2 className="w-3 h-3 text-zinc-700 mt-0.5" />
                          Attempt to resolve dispute before filing (Bona Fide Effort).
                        </li>
                        <li className="text-[10px] text-zinc-500 flex items-start gap-2">
                          <CheckCircle2 className="w-3 h-3 text-zinc-700 mt-0.5" />
                          Claim must be $10,000 or less.
                        </li>
                        <li className="text-[10px] text-zinc-500 flex items-start gap-2">
                          <CheckCircle2 className="w-3 h-3 text-zinc-700 mt-0.5" />
                          Verify Statute of Limitations (6 yrs contract / 2 yrs injury).
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {phase.id === 2 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest">Jurisdiction Check</label>
                        <div className="grid grid-cols-1 gap-2">
                          {(['Defendant Residence', 'Event Location', 'Other'] as const).map((basis) => (
                            <button
                              key={basis}
                              onClick={() => updateData({ jurisdictionBasis: basis })}
                              className={cn(
                                "flex items-center justify-between p-3 border text-left transition-all",
                                data.jurisdictionBasis === basis ? "bg-orange-900/10 border-orange-900/50 text-orange-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"
                              )}
                            >
                              <span className="text-[10px] font-mono uppercase">{basis}</span>
                              {data.jurisdictionBasis === basis ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 text-zinc-800" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest">Defendant Type</label>
                        <div 
                          onClick={() => updateData({ isBusinessDefendant: !data.isBusinessDefendant })}
                          className={cn(
                            "flex items-center justify-between p-3 border cursor-pointer transition-all",
                            data.isBusinessDefendant ? "bg-blue-900/10 border-blue-900/50" : "bg-zinc-900 border-zinc-800"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Users className={cn("w-4 h-4", data.isBusinessDefendant ? "text-blue-500" : "text-zinc-600")} />
                            <span className="text-[10px] font-mono uppercase text-zinc-300">Business Defendant (LLC/Inc)?</span>
                          </div>
                          {data.isBusinessDefendant ? <CheckCircle2 className="w-4 h-4 text-blue-500" /> : <Circle className="w-4 h-4 text-zinc-800" />}
                        </div>
                        {data.isBusinessDefendant && (
                          <div className="p-3 bg-zinc-950 border border-zinc-800 text-[9px] font-mono text-zinc-500 flex items-center justify-between">
                            <span>Verify Registered Agent via SOS</span>
                            <a href="https://sos.oregon.gov/business/Pages/find.aspx" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                              SOS Search <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-zinc-900/30 border border-zinc-800 space-y-4">
                        <h4 className="text-[10px] font-mono uppercase text-zinc-400 tracking-widest border-b border-zinc-800 pb-2">Estimated Filing Fees (2026)</h4>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-zinc-500">Base Filing Fee:</span>
                          <span className="text-sm font-mono text-zinc-100">${calculateFee(data.claimAmount)}</span>
                        </div>
                        <div 
                          onClick={() => updateData({ feeWaiverRequested: !data.feeWaiverRequested })}
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          {data.feeWaiverRequested ? <CheckCircle2 className="w-3 h-3 text-orange-500" /> : <Circle className="w-3 h-3 text-zinc-800 group-hover:text-zinc-600" />}
                          <span className="text-[9px] font-mono uppercase text-zinc-500 group-hover:text-zinc-400">Request Fee Waiver (Low Income)</span>
                        </div>
                      </div>

                      <div className="p-4 bg-orange-900/10 border border-orange-900/30 space-y-2">
                        <div className="flex items-center gap-2 text-orange-500">
                          <Info className="w-4 h-4" />
                          <span className="text-[10px] font-mono uppercase tracking-widest">Required Form</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-mono">"Small Claim and Notice of Small Claim"</p>
                      </div>
                    </div>
                  </div>
                )}

                {phase.id === 3 && (
                  <div className="space-y-6">
                    <div className="p-4 bg-red-900/10 border border-red-900/30 flex items-start gap-4">
                      <Clock className="w-5 h-5 text-red-500 mt-1" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-mono uppercase text-red-400 tracking-widest">The 63-Day Deadline</h4>
                        <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
                          Proof of Service must be filed within 63 days of the original filing date. Failure to do so will result in automatic dismissal.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { title: 'Sheriff Service', fee: '~$35.00', desc: `Payable to ${activeCase.jurisdiction} Sheriff.` },
                        { title: 'Private Server', fee: 'Varies', desc: 'Higher cost, often faster.' },
                        { title: 'Certified Mail', fee: '~$15.00', desc: 'Requires Certified + First Class simultaneously.' }
                      ].map((method) => (
                        <div key={method.title} className="p-4 bg-zinc-900 border border-zinc-800 space-y-2">
                          <h5 className="text-[10px] font-mono uppercase text-zinc-300 tracking-widest">{method.title}</h5>
                          <div className="text-xs font-mono text-orange-500">{method.fee}</div>
                          <p className="text-[9px] text-zinc-600 font-mono leading-tight">{method.desc}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-zinc-950 border border-zinc-800">
                      <UserCheck className="w-5 h-5 text-zinc-500" />
                      <div className="flex-1">
                        <div className="text-[10px] font-mono uppercase text-zinc-400">Proof of Service Status</div>
                        <div className="text-[9px] text-zinc-600 font-mono italic">Document not yet generated. Finalize Phase 2 first.</div>
                      </div>
                    </div>
                  </div>
                )}

                {phase.id === 4 && (
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-900/10 border border-blue-900/30 flex items-start gap-4">
                      <Info className="w-5 h-5 text-blue-500 mt-1" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-mono uppercase text-blue-400 tracking-widest">2026 Update: HB 2463</h4>
                        <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
                          The defendant's response window has been extended from 14 days to <span className="text-blue-400 font-bold">30 days</span>.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-3">
                        <h5 className="text-[10px] font-mono uppercase text-zinc-300 tracking-widest">If No Response</h5>
                        <p className="text-[9px] text-zinc-600 font-mono">After 30 days of service.</p>
                        <button className="w-full py-2 bg-zinc-800 text-[9px] font-mono uppercase text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-all">
                          Motion for Default
                        </button>
                      </div>
                      <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-3">
                        <h5 className="text-[10px] font-mono uppercase text-zinc-300 tracking-widest">If Admits & Pays</h5>
                        <p className="text-[9px] text-zinc-600 font-mono">Defendant settles the debt.</p>
                        <button className="w-full py-2 bg-zinc-800 text-[9px] font-mono uppercase text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-all">
                          Satisfaction of Judgment
                        </button>
                      </div>
                      <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-3">
                        <h5 className="text-[10px] font-mono uppercase text-zinc-300 tracking-widest">If Denies/Hearing</h5>
                        <p className="text-[9px] text-zinc-600 font-mono">Case proceeds to mediation.</p>
                        <button className="w-full py-2 bg-zinc-800 text-[9px] font-mono uppercase text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-all">
                          Prepare for Mediation
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {phase.id === 5 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="p-4 bg-zinc-900/30 border border-zinc-800 space-y-4">
                        <h4 className="text-[10px] font-mono uppercase text-zinc-400 tracking-widest border-b border-zinc-800 pb-2">Mediation Protocol</h4>
                        <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
                          {activeCase.jurisdiction} Circuit Court requires mediation before a judge will hear the case. This is a neutral meeting to attempt settlement.
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-zinc-700" />
                            <span className="text-[9px] font-mono text-zinc-600 uppercase">No Lawyers Allowed (without permission)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-zinc-700" />
                            <span className="text-[9px] font-mono text-zinc-600 uppercase">Neutral Third Party Facilitator</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-orange-900/10 border border-orange-900/30 space-y-3">
                        <div className="flex items-center gap-2 text-orange-500">
                          <Gavel className="w-4 h-4" />
                          <span className="text-[10px] font-mono uppercase tracking-widest">If Mediation Fails</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                          The case will be set for a trial in front of a Judge. Be prepared with your evidence manifold and exhibits.
                        </p>
                      </div>
                      <button className="w-full py-3 bg-zinc-900 border border-zinc-800 text-[10px] font-mono uppercase text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-all">
                        Generate Mediation Brief
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-500 italic leading-relaxed">
        <span className="text-orange-500 font-bold uppercase mr-2">Case Upload Logic:</span>
        The engine automatically extracts timelines from receipts/emails to verify the Statute of Limitations. 
        Evidence is categorized into Exhibits (e.g., Exhibit A: Contract) to ensure procedural compliance in {activeCase.jurisdiction}.
      </div>
    </div>
  );
};
