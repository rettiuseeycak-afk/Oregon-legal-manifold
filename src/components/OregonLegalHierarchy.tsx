import React from 'react';
import { Scale, BookOpen, Gavel, MapPin, CheckCircle2, Circle } from 'lucide-react';
import { Case } from '../types';
import { cn } from '../lib/utils';

interface OregonLegalHierarchyProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
}

export const OregonLegalHierarchy: React.FC<OregonLegalHierarchyProps> = ({ activeCase, onUpdateCase }) => {
  const hierarchy = activeCase.oregonLegalHierarchy || {
    orsChecked: false,
    utcrChecked: false,
    slrChecked: false,
    municipalCodeChecked: false,
  };

  const toggleHierarchy = (step: keyof typeof hierarchy) => {
    const updatedHierarchy = { ...hierarchy, [step]: !hierarchy[step] };
    onUpdateCase({ ...activeCase, oregonLegalHierarchy: updatedHierarchy as any });
  };

  const layers = [
    {
      id: 'orsChecked',
      title: 'Oregon Revised Statutes (ORS)',
      description: 'The actual "laws" (e.g., Landlord/Tenant law, Criminal Code).',
      icon: BookOpen,
      source: 'State Statutes',
    },
    {
      id: 'utcrChecked',
      title: 'Uniform Trial Court Rules (UTCR)',
      description: 'How you must behave and format papers in every Oregon court.',
      icon: Scale,
      source: 'State Procedure',
    },
    {
      id: 'slrChecked',
      title: 'Supplementary Local Rules (SLR)',
      description: 'Specific "quirks" for Baker County (e.g., hearing days).',
      icon: Gavel,
      source: 'Local Rules (Baker County)',
    },
    {
      id: 'municipalCodeChecked',
      title: 'Baker City Municipal Code',
      description: 'Local ordinances like parking, zoning, or city-specific nuisances.',
      icon: MapPin,
      source: 'City Laws',
    },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-300">Oregon Legal Hierarchy (Baker City)</h3>
        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
          <Scale className="w-3 h-3" />
          Prioritizing Legal Sources
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {layers.map((layer) => {
          const isChecked = (hierarchy as any)[layer.id];
          const LayerIcon = layer.icon;
          
          return (
            <div 
              key={layer.id}
              className={cn(
                "flex flex-col gap-3 p-4 border transition-all cursor-pointer",
                isChecked 
                  ? "bg-orange-900/10 border-orange-900/50" 
                  : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
              )}
              onClick={() => toggleHierarchy(layer.id as any)}
            >
              <div className="flex items-center justify-between">
                <div className={cn(
                  "p-2 rounded-full",
                  isChecked ? "bg-orange-900/30 text-orange-500" : "bg-zinc-900 text-zinc-700"
                )}>
                  <LayerIcon className="w-4 h-4" />
                </div>
                {isChecked ? (
                  <CheckCircle2 className="w-4 h-4 text-orange-500" />
                ) : (
                  <Circle className="w-4 h-4 text-zinc-800" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono uppercase text-zinc-500 tracking-widest">{layer.source}</span>
                </div>
                <h4 className={cn(
                  "text-[10px] font-mono uppercase tracking-widest",
                  isChecked ? "text-orange-400" : "text-zinc-300"
                )}>
                  {layer.title}
                </h4>
                <p className="text-[10px] text-zinc-500 leading-relaxed">{layer.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-500 italic leading-relaxed">
        <span className="text-orange-500 font-bold uppercase mr-2">RAG Mode:</span>
        The AI is constrained to prioritize these specific Oregon resources. 
        If a local dispute is detected, the Baker City Code of Ordinances (Municode) will be queried specifically.
      </div>
    </div>
  );
};
