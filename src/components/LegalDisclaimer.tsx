import React from 'react';
import { ShieldAlert, ExternalLink, Info } from 'lucide-react';

export const LegalDisclaimer: React.FC = () => {
  return (
    <div className="bg-orange-950/20 border border-orange-900/50 p-6 space-y-4">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-orange-900/30 rounded-full">
          <ShieldAlert className="w-5 h-5 text-orange-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-mono uppercase tracking-widest text-orange-200">Legal Disclaimer & UPL Guardrail</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            This application provides legal information and automated document generation based on the Oregon Revised Statutes (ORS), Uniform Trial Court Rules (UTCR), and Baker County Supplementary Local Rules (SLR). 
            <span className="text-orange-400 font-bold ml-1">It does not provide legal advice.</span> 
            The software cannot tell you which legal strategy to pick or predict the outcome of your case.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
        <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all group">
          <div className="flex items-center gap-3">
            <Info className="w-4 h-4 text-zinc-500" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase text-zinc-300">Modest Means Program</span>
              <span className="text-[8px] font-mono text-zinc-500">Low-cost legal consultations</span>
            </div>
          </div>
          <a 
            href="https://www.osbar.org/public/ris/index.html#modestmeans" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-1.5 text-zinc-600 group-hover:text-orange-500 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all group">
          <div className="flex items-center gap-3">
            <Info className="w-4 h-4 text-zinc-500" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase text-zinc-300">Oregon iForms</span>
              <span className="text-[8px] font-mono text-zinc-500">Official OJD Guide & File</span>
            </div>
          </div>
          <a 
            href="https://www.courts.oregon.gov/services/online/Pages/iforms.aspx" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-1.5 text-zinc-600 group-hover:text-orange-500 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
