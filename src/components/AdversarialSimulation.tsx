import React, { useState } from 'react';
import { generateContentProxy } from '../lib/geminiClient';
import { Case, requirePlan } from '../types';
import { ShieldAlert, Loader2, Search, AlertCircle, FileText, Gavel, Target, Zap, Lock } from 'lucide-react';
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';
import { CitationSearch } from './CitationSearch';

interface AdversarialSimulationProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
  user?: { plan: string };
  showUpgradeModal?: (message: string) => void;
}

export const AdversarialSimulation: React.FC<AdversarialSimulationProps> = ({
  activeCase,
  onUpdateCase,
  user,
  showUpgradeModal
}) => {
  const [inputDraft, setInputDraft] = useState(activeCase.adversarialSimulation?.input || '');
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCitationSearch, setShowCitationSearch] = useState(false);

  const runSimulation = async () => {
    if (user && showUpgradeModal && !requirePlan(user, "elite")) {
      return showUpgradeModal("Elite plan required for litigation strategy engine.");
    }

    if (!inputDraft.trim()) return;

    setIsSimulating(true);
    setError(null);
    
    const prompt = `
      <persona>
      You are an elite defense attorney from a "Big Law" firm specializing in technicalities and procedural dismissals. Your goal is to find one "thread" in this Pro Se filing and pull it until the entire case unravels.
      </persona>

      <objective>
      Conduct an "Adversarial Motion to Dismiss Simulation" on the provided legal draft. Identify critical weaknesses that would lead to a Rule 12(b)(6) dismissal.
      </objective>

      <attack_parameters>
      1. **Rule 12(b)(6) Logic Gap:** Where does the Plaintiff allege a "Harm" but fail to prove a "Legal Duty"?
      2. **The "Heppner" Privilege Scan:** Are there any sections where the AI seems to be "filling in the blanks" for missing evidence?
      3. **Menger Curvature Analysis:** Identify any "legal leaps" where the reasoning trajectory is too sharp (unsupported by the cited precedent).
      4. **Statutory Standing:** Does the Plaintiff actually have the right to sue under this specific code, or is this a "generalized grievance"?
      </attack_parameters>

      <input_document>
      ${inputDraft}
      </input_document>

      <output_format>
      ### 1. THE DISMISSAL TARGET: [Specific Claim]
      - **The Weakness:** [Why this claim fails the Rule 12(b)(6) standard]
      - **The "Killer" Counter-Argument:** [The exact paragraph for the Motion to Dismiss]
      - **Survival Strategy:** [How to rewrite this section to be "Dismissal-Proof"]

      ### 2. THE CITATION TRAP
      - **Flagged Authority:** [The case or statute that is being "stretched" too far]
      - **The Risk:** [Why a judge will find this citation irrelevant]
      - **The Rectification:** [The correct "Anchor" to use instead]
      </output_format>
    `;

    try {
      const response = await generateContentProxy({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: "HIGH" },
        },
      });

      const report = response.text || "Simulation failed to generate a report.";

      onUpdateCase({
        ...activeCase,
        adversarialSimulation: {
          input: inputDraft,
          report: report
        }
      });
    } catch (err: any) {
      setError(err.message || "Failed to run adversarial simulation.");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <h2 className="text-xl font-serif italic text-zinc-100">Adversarial Simulation</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCitationSearch(!showCitationSearch)}
            className={cn(
              "px-4 py-2 border font-mono text-[10px] uppercase tracking-widest transition-all flex items-center gap-2",
              showCitationSearch 
                ? "bg-red-600 border-red-600 text-white" 
                : "bg-transparent border-zinc-800 text-zinc-400 hover:border-zinc-600"
            )}
          >
            <Search className="w-3.5 h-3.5" />
            {showCitationSearch ? "Hide Citations" : "Search Citations"}
          </button>
          <button
            onClick={runSimulation}
            disabled={isSimulating || !inputDraft.trim()}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            Run Attack Simulation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={cn(
          "space-y-4 transition-all duration-500",
          showCitationSearch ? "lg:col-span-4" : "lg:col-span-6"
        )}>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Legal Draft for Attack</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setInputDraft(activeCase.generatedDocs.complaint || '')}
                className="text-[9px] font-mono text-zinc-400 hover:text-zinc-200 underline"
              >
                Load Complaint
              </button>
              <button 
                onClick={() => setInputDraft(activeCase.generatedDocs.motion || '')}
                className="text-[9px] font-mono text-zinc-400 hover:text-zinc-200 underline"
              >
                Load Motion
              </button>
            </div>
          </div>
          <textarea
            value={inputDraft}
            onChange={(e) => setInputDraft(e.target.value)}
            placeholder="Paste your legal draft here for adversarial analysis..."
            className="w-full h-[500px] bg-zinc-950 border border-zinc-800 p-4 text-zinc-300 font-mono text-xs focus:border-red-900 focus:ring-1 focus:ring-red-900 outline-none transition-all resize-none"
          />
        </div>

        <div className={cn(
          "space-y-4 transition-all duration-500",
          showCitationSearch ? "lg:col-span-4" : "lg:col-span-6"
        )}>
          <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Big Law Attack Report</label>
          <div className="w-full h-[500px] bg-zinc-900/30 border border-zinc-800 p-6 overflow-y-auto">
            {isSimulating ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest animate-pulse">
                    Defense Counsel is Scrutinizing...
                  </p>
                  <p className="text-[9px] font-mono text-zinc-600 italic">
                    Analyzing Rule 12(b)(6) Logic Gaps and Menger Curvature...
                  </p>
                </div>
              </div>
            ) : activeCase.adversarialSimulation?.report ? (
              <div className="prose prose-invert prose-zinc max-w-none prose-sm font-serif">
                <Markdown>{activeCase.adversarialSimulation.report}</Markdown>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-700 space-y-4">
                <ShieldAlert className="w-12 h-12 opacity-20" />
                <p className="text-[10px] font-mono uppercase tracking-widest">No Attack Report Generated</p>
              </div>
            )}
          </div>
        </div>

        {showCitationSearch && (
          <div className="lg:col-span-4">
            <CitationSearch />
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-900/50 text-red-400 text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
};
