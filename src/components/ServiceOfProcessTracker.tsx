import React from 'react';
import { CheckCircle2, Circle, AlertCircle, UserCheck, FileCheck, Send } from 'lucide-react';
import { Case } from '../types';
import { cn } from '../lib/utils';

interface ServiceOfProcessTrackerProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
}

export const ServiceOfProcessTracker: React.FC<ServiceOfProcessTrackerProps> = ({ activeCase, onUpdateCase }) => {
  const sop = activeCase.serviceOfProcess || {
    complaintFiled: false,
    servedOtherParty: false,
    proofOfServiceFiled: false,
  };

  const toggleStep = (step: keyof typeof sop) => {
    const updatedSop = { ...sop, [step]: !sop[step] };
    onUpdateCase({ ...activeCase, serviceOfProcess: updatedSop as any });
  };

  const steps = [
    {
      id: 'complaintFiled',
      title: 'File the Complaint',
      description: 'Submit the formal complaint to the Baker County Circuit Court clerk.',
      icon: FileCheck,
    },
    {
      id: 'servedOtherParty',
      title: 'Serve Other Party',
      description: 'Deliver the summons and complaint via a professional process server or Sheriff.',
      icon: Send,
    },
    {
      id: 'proofOfServiceFiled',
      title: 'File Proof of Service',
      description: 'Submit the signed Proof of Service document to the court clerk.',
      icon: UserCheck,
    },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-300">Oregon Service of Process Tracker</h3>
        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
          <AlertCircle className="w-3 h-3" />
          Procedural Compliance Required
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCompleted = (sop as any)[step.id];
          const StepIcon = step.icon;
          
          return (
            <div 
              key={step.id}
              className={cn(
                "flex items-start gap-4 p-4 border transition-all cursor-pointer",
                isCompleted 
                  ? "bg-green-900/10 border-green-900/50" 
                  : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
              )}
              onClick={() => toggleStep(step.id as any)}
            >
              <div className={cn(
                "p-2 rounded-full",
                isCompleted ? "bg-green-900/30 text-green-500" : "bg-zinc-900 text-zinc-700"
              )}>
                <StepIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className={cn(
                    "text-xs font-mono uppercase tracking-widest",
                    isCompleted ? "text-green-400" : "text-zinc-300"
                  )}>
                    {index + 1}. {step.title}
                  </h4>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-zinc-800" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {sop.complaintFiled && sop.servedOtherParty && !sop.proofOfServiceFiled && (
        <div className="p-4 bg-orange-900/20 border border-orange-900/50 text-orange-400 text-[10px] font-mono uppercase tracking-widest flex items-center gap-3 animate-pulse">
          <AlertCircle className="w-4 h-4" />
          CRITICAL: Proof of Service must be filed within 60 days of filing the complaint.
        </div>
      )}
    </div>
  );
};
