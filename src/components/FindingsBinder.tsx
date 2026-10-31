import React, { useState, useMemo } from 'react';
import { Case, CaseLoadFinding } from '../types';
import { generateContentProxy } from '../lib/geminiClient';
import { 
  FolderSearch, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  FileWarning,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import manifoldData from '../data/oregonLegalManifold.json';
import { OregonLegalManifold } from '../types';

const manifold = manifoldData as OregonLegalManifold;

enum Type {
  OBJECT = 'OBJECT',
  ARRAY = 'ARRAY',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
}

interface FindingsBinderProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
}

export const FindingsBinder: React.FC<FindingsBinderProps> = ({ activeCase, onUpdateCase }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aggregate existing findings from all evidence
  const existingFindings = useMemo(() => {
    return activeCase.evidence.flatMap(e => e.findings || []);
  }, [activeCase.evidence]);

  const generateFindingsSummary = async () => {
    if (activeCase.evidence.length === 0) {
      setError("No documents available to scan.");
      return;
    }

    setIsScanning(true);
    setError(null);
    
    // Prepare document summaries for the AI to analyze cross-document discrepancies
    const documentsContext = activeCase.evidence.map(e => `
      DOCUMENT ID: ${e.id}
      TITLE: ${e.title}
      TYPE: ${e.type}
      DATE: ${e.date || 'Unknown'}
      CONTENT SUMMARY: ${e.summary || e.content.substring(0, 1000)}
    `).join('\n\n');

    const prompt = `
      Analyze the following case documents to identify discrepancies automatically.
      
      Perform the following logic checks across all documents:
      1. Check for missing required fields (e.g., missing signatures, missing dates).
      2. Cross-reference dates or identifiers (e.g., a document predating the case filing, conflicting dates between documents).
      3. Identify logical inconsistencies or legal errors.
      4. STATUTE OF LIMITATIONS (SOL) CHECK: Verify if the claims are within the Oregon SOL based on the provided manifold rules.
      5. OREGON PROCEDURAL AUDIT: Specifically check for UTCR 5.010 conferral requirements. If an ORCP 21 motion is detected, verify if a Certificate of Conferral is present. Note that while ORCP 21 F is exempt, a missing certificate for other ORCP 21 grounds is a critical procedural error.
      
      CASE JURISDICTION: ${activeCase.jurisdiction || 'Unknown'}
      
      OREGON LEGAL MANIFOLD (REFERENCE):
      ${JSON.stringify(manifold.rules)}
      
      DOCUMENTS:
      ${documentsContext}
    `;

    try {
      const response = await generateContentProxy({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              findings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    documentId: { type: Type.STRING, description: "The ID of the document this finding relates to, if applicable." },
                    findingType: { type: Type.STRING, description: "e.g., Missing Signature, Chronological Discrepancy, Legal Error" },
                    severity: { type: Type.STRING, enum: ['High', 'Medium', 'Low', 'Critical'] },
                    description: { type: Type.STRING, description: "Detailed description of the issue and its impact." },
                    status: { type: Type.STRING, enum: ['Unresolved', 'Flagged', 'Resolved'] },
                    type: { type: Type.STRING, enum: ['unauthorized_info', 'discrepancy', 'violation'] },
                    suggestedAction: { type: Type.STRING }
                  },
                  required: ["findingType", "severity", "description", "status"]
                }
              }
            },
            required: ["findings"]
          }
        },
      });

      const data = JSON.parse(response.text || '{}');
      const newFindings: CaseLoadFinding[] = (data.findings || []).map((f: any) => ({
        ...f,
        id: crypto.randomUUID(),
        caseId: activeCase.id
      }));

      // Merge new findings with existing ones, avoiding exact duplicates
      const updatedEvidence = activeCase.evidence.map(ev => {
        const evFindings = [...(ev.findings || [])];
        const newEvFindings = newFindings.filter(nf => nf.documentId === ev.id);
        
        newEvFindings.forEach(nf => {
          if (!evFindings.some(ef => ef.description === nf.description)) {
            evFindings.push(nf);
          }
        });

        return { ...ev, findings: evFindings };
      });

      // Also handle findings that don't map to a specific document (case-level findings)
      // For now, we attach them to the first document or handle them differently.
      // Let's just attach them to the first document if they don't have a documentId.
      if (updatedEvidence.length > 0) {
        const caseLevelFindings = newFindings.filter(nf => !nf.documentId || !activeCase.evidence.some(e => e.id === nf.documentId));
        if (caseLevelFindings.length > 0) {
          updatedEvidence[0].findings = [...(updatedEvidence[0].findings || []), ...caseLevelFindings];
        }
      }

      onUpdateCase({
        ...activeCase,
        evidence: updatedEvidence
      });

    } catch (err: any) {
      setError(err.message || "Failed to generate findings summary.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <FolderSearch className="w-5 h-5 text-orange-500" />
          <h2 className="text-xl font-serif italic text-zinc-100">Findings Binder</h2>
        </div>
        <button
          onClick={generateFindingsSummary}
          disabled={isScanning || activeCase.evidence.length === 0}
          className="px-6 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
        >
          {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Generate Summary
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-900/50 text-red-400 text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-400">Aggregated Findings</h3>
          <span className="text-xs font-mono text-zinc-500">{existingFindings.length} Total Issues</span>
        </div>

        {existingFindings.length === 0 ? (
          <div className="p-12 border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 space-y-4">
            <FolderSearch className="w-8 h-8 opacity-50" />
            <p className="text-xs font-mono uppercase tracking-widest">No findings generated yet.</p>
            <p className="text-[10px] text-zinc-600 text-center max-w-md">
              Click "Generate Summary" to run an automated scan across all case documents to identify missing signatures, chronological discrepancies, and legal errors.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {existingFindings.map((finding) => {
              const relatedDoc = activeCase.evidence.find(e => e.id === finding.documentId);
              return (
                <div key={finding.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-sm space-y-3 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn(
                      "px-2 py-1 text-[9px] font-mono uppercase rounded-sm",
                      finding.type === 'unauthorized_info' ? "bg-red-900/40 text-red-400" :
                      finding.type === 'violation' ? "bg-orange-900/40 text-orange-400" :
                      "bg-blue-900/40 text-blue-400"
                    )}>
                      {finding.findingType || finding.type?.replace('_', ' ')}
                    </span>
                    <span className={cn(
                      "text-[9px] font-mono uppercase px-2 py-1 rounded-sm border",
                      finding.status === 'Unresolved' ? "border-red-900/50 text-red-400 bg-red-950/30" :
                      finding.status === 'Flagged' ? "border-orange-900/50 text-orange-400 bg-orange-950/30" :
                      "border-green-900/50 text-green-400 bg-green-950/30"
                    )}>
                      {finding.status || 'Unresolved'}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-xs text-zinc-300 leading-relaxed">{finding.description}</p>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/50 space-y-2">
                    {relatedDoc && (
                      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                        <span className="uppercase tracking-widest">Target:</span>
                        <span className="truncate text-zinc-400" title={relatedDoc.title}>{relatedDoc.title}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-[10px] font-mono uppercase flex items-center gap-1",
                        finding.severity === 'CRITICAL' || finding.severity === 'High' ? "text-red-500 font-bold" :
                        finding.severity === 'HIGH' || finding.severity === 'Medium' ? "text-orange-500" :
                        "text-zinc-500"
                      )}>
                        {finding.severity === 'CRITICAL' || finding.severity === 'High' ? <AlertTriangle className="w-3 h-3" /> : 
                         finding.severity === 'Resolved' ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : 
                         <AlertCircle className="w-3 h-3" />}
                        {finding.severity} Severity
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
