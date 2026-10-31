import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Scale, 
  Gavel, 
  Zap, 
  CheckCircle2, 
  Info,
  Shield,
  Building2,
  FileText
} from 'lucide-react';
import { Case, LegalClaim } from '../types';
import { cn } from '../lib/utils';

interface CaseWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCase: (newCase: Case) => void;
  existingCaseCount: number;
}

interface WizardClaim {
  title: string;
  description: string;
}

const STEPS = [
  { id: 'basic', title: 'Case Identity', icon: <Scale className="w-4 h-4" /> },
  { id: 'legal', title: 'Legal Context', icon: <Gavel className="w-4 h-4" /> },
  { id: 'claims', title: 'Initial Claims', icon: <Zap className="w-4 h-4" /> },
  { id: 'review', title: 'Final Review', icon: <CheckCircle2 className="w-4 h-4" /> }
];

export const CaseWizard: React.FC<CaseWizardProps> = ({ isOpen, onClose, onCreateCase, existingCaseCount }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: `Legal Case ${existingCaseCount + 1}`,
    jurisdiction: '',
    courtRules: '',
    claims: [] as WizardClaim[]
  });

  const [newClaim, setNewClaim] = useState({ title: '', description: '' });

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const addClaim = () => {
    if (newClaim.title && newClaim.description) {
      setFormData(prev => ({
        ...prev,
        claims: [...prev.claims, { ...newClaim }]
      }));
      setNewClaim({ title: '', description: '' });
    }
  };

  const removeClaim = (index: number) => {
    setFormData(prev => ({
      ...prev,
      claims: prev.claims.filter((_, i) => i !== index)
    }));
  };

  const handleCreate = () => {
    const newCase: Case = {
      id: `CASE-${Date.now()}`,
      name: formData.name,
      jurisdiction: formData.jurisdiction,
      courtRules: formData.courtRules,
      evidence: [],
      claims: formData.claims.map((c, i) => ({
        ...c,
        id: `CLAIM-${Date.now()}-${i}`,
        evidenceIds: []
      })),
      generatedDocs: {}
    };
    onCreateCase(newCase);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-600 flex items-center justify-center rounded-sm">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-serif italic text-zinc-100">Initialize Reasoning Manifold</h2>
              <div className="flex items-center gap-3 mt-1">
                {STEPS.map((step, i) => (
                  <React.Fragment key={step.id}>
                    <div className={cn(
                      "text-[9px] font-mono uppercase tracking-widest flex items-center gap-1.5 transition-colors",
                      i <= currentStep ? "text-orange-500" : "text-zinc-600"
                    )}>
                      {step.icon}
                      <span className="hidden sm:inline">{step.title}</span>
                    </div>
                    {i < STEPS.length - 1 && <ChevronRight className="w-2.5 h-2.5 text-zinc-800" />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 text-zinc-500 transition-colors rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {currentStep === 0 && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-zinc-400">Step 1: Case Identity</h3>
                    <p className="text-xs text-zinc-500 font-serif leading-relaxed italic">
                      Establish the baseline identity of the legal manifold. This name is used for internal organization and document headers.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="group">
                      <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 group-focus-within:text-orange-500 transition-colors">
                        Case Reference Name
                      </label>
                      <input 
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 p-4 font-serif italic text-lg focus:outline-none focus:border-orange-500/50 transition-all rounded-sm"
                        placeholder="e.g., Doe v. Corporate Entity"
                      />
                    </div>

                    <div className="group">
                      <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 group-focus-within:text-indigo-500 transition-colors">
                        Primary Jurisdiction
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        <input 
                          type="text"
                          list="jurisdictions-wizard"
                          value={formData.jurisdiction}
                          onChange={(e) => setFormData(prev => ({ ...prev, jurisdiction: e.target.value }))}
                          className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 pl-12 pr-4 py-3 font-mono text-xs focus:outline-none focus:border-indigo-500/50 transition-all rounded-sm"
                          placeholder="Select or enter jurisdiction..."
                        />
                        <datalist id="jurisdictions-wizard">
                          <option value="Multnomah County Circuit Court" />
                          <option value="Washington County Circuit Court" />
                          <option value="Clackamas County Circuit Court" />
                          <option value="Lane County Circuit Court" />
                          <option value="Marion County Circuit Court" />
                          <option value="Federal District Court of Oregon" />
                        </datalist>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-zinc-400">Step 2: Legal Context</h3>
                    <p className="text-xs text-zinc-500 font-serif leading-relaxed italic">
                      Define the procedural constraints for this manifold. Cite specific ORCP, UTCR, or Local Rules that govern the proceedings.
                    </p>
                  </div>

                  <div className="group">
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 group-focus-within:text-orange-500 transition-colors">
                      Governing Rules & Procedures
                    </label>
                    <textarea 
                      value={formData.courtRules}
                      onChange={(e) => setFormData(prev => ({ ...prev, courtRules: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 p-6 font-mono text-xs leading-relaxed min-h-[200px] focus:outline-none focus:border-orange-500/50 transition-all rounded-sm resize-none"
                      placeholder="e.g., Proceedings governed by UTCR 2.010, ORCP 7, and Multnomah County SLR Chapter 5..."
                    />
                  </div>

                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-sm flex items-start gap-3">
                    <Info className="w-4 h-4 text-zinc-600 mt-0.5" />
                    <p className="text-[10px] text-zinc-600 font-mono italic leading-relaxed">
                      Statutory references allow the Document Generator to automatically populate Pleading Paper headers and verification blocks.
                    </p>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-zinc-400">Step 3: Initial Claims</h3>
                    <p className="text-xs text-zinc-500 font-serif leading-relaxed italic">
                      Enter the primary legal grievances. These will be mapped to the Evidence Manifold in subsequent stages.
                    </p>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-sm space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-4">
                        <input 
                          type="text"
                          value={newClaim.title}
                          onChange={(e) => setNewClaim(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 p-3 text-xs font-bold font-mono focus:outline-none focus:border-orange-500/50 rounded-sm"
                          placeholder="Claim Title (e.g., Breach of Contract)"
                        />
                        <textarea 
                          value={newClaim.description}
                          onChange={(e) => setNewClaim(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 p-3 text-xs font-serif italic min-h-[80px] focus:outline-none focus:border-orange-500/50 rounded-sm resize-none"
                          placeholder="Brief legal and factual description..."
                        />
                      </div>
                      <button 
                        onClick={addClaim}
                        disabled={!newClaim.title || !newClaim.description}
                        className="self-end px-4 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded-sm transition-all"
                      >
                        <Zap className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {formData.claims.length === 0 ? (
                      <div className="py-12 border border-dashed border-zinc-800 rounded-sm flex flex-col items-center justify-center text-zinc-700">
                        <Zap className="w-8 h-8 mb-4 opacity-10" />
                        <p className="text-[10px] font-mono uppercase tracking-widest">No claims defined</p>
                      </div>
                    ) : (
                      formData.claims.map((claim, idx) => (
                        <div key={idx} className="p-4 bg-zinc-900 border border-zinc-800 rounded-sm flex items-start justify-between group">
                          <div>
                            <h4 className="text-xs font-bold text-zinc-200 font-mono uppercase tracking-tighter">{claim.title}</h4>
                            <p className="text-[10px] text-zinc-500 font-serif italic mt-1 line-clamp-1">{claim.description}</p>
                          </div>
                          <button 
                            onClick={() => removeClaim(idx)}
                            className="p-1 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-zinc-400">Step 4: Final Review</h3>
                    <p className="text-xs text-zinc-500 font-serif leading-relaxed italic">
                      Verify the initialized parameters before constructing the manifold.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-sm space-y-4">
                      <div>
                        <span className="text-[9px] font-mono text-zinc-600 uppercase">Case Name</span>
                        <p className="text-sm font-serif italic text-zinc-100 mt-1">{formData.name}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-zinc-600 uppercase">Jurisdiction</span>
                        <p className="text-xs font-mono text-zinc-300 mt-1">{formData.jurisdiction || 'Not Defined'}</p>
                      </div>
                    </div>
                    <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-sm space-y-4">
                      <div>
                        <span className="text-[9px] font-mono text-zinc-600 uppercase">Initial Claims</span>
                        <p className="text-xs font-mono text-zinc-300 mt-1">{formData.claims.length} Claim(s) Initialized</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-zinc-600 uppercase">Court Rules</span>
                        <p className="text-xs font-mono text-zinc-300 mt-1 line-clamp-1 italic">{formData.courtRules || 'None Set'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border border-orange-500/20 bg-orange-500/5 rounded-sm">
                    <div className="flex items-start gap-4">
                      <Shield className="w-6 h-6 text-orange-600" />
                      <div>
                        <h4 className="text-xs font-mono font-bold text-orange-500 uppercase tracking-widest mb-2">Initialize Manifold</h4>
                        <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
                          By creating this case, you are initializing a persistent reasoning space. 
                          The configuration can be modified later via the Case Dashboard or Evidence Manifold.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <button 
            onClick={prevStep}
            className={cn(
              "px-6 py-2 text-[10px] font-mono uppercase tracking-[0.2em] transition-all flex items-center gap-2",
              currentStep === 0 ? "text-zinc-700 pointer-events-none" : "text-zinc-400 hover:text-zinc-100"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous Trace
          </button>
          
          {currentStep < STEPS.length - 1 ? (
            <button 
              onClick={nextStep}
              className="px-8 py-2 bg-zinc-100 text-zinc-950 text-[10px] font-mono font-bold uppercase tracking-[0.2em] hover:bg-white transition-all flex items-center gap-2"
            >
              Continue to Step {currentStep + 2}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleCreate}
              className="px-10 py-2 bg-orange-600 text-white text-[10px] font-mono font-bold uppercase tracking-[0.2em] hover:bg-orange-500 transition-all flex items-center gap-2 shadow-lg shadow-orange-950/20"
            >
              Construct Manifold
              <Shield className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
