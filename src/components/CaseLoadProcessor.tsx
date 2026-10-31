import React, { useState, useRef } from 'react';
import { Case, Evidence, CaseLoadFinding } from '../types';
import { generateContentProxy } from '../lib/geminiClient';
import { 
  Upload, 
  File, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert, 
  AlertTriangle, 
  Search, 
  FolderPlus, 
  FileWarning,
  ChevronRight,
  ChevronDown,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';

enum Type {
  OBJECT = 'OBJECT',
  ARRAY = 'ARRAY',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
}

interface CaseLoadProcessorProps {
  cases: Case[];
  onUpdateCase: (updatedCase: Case) => void;
  onCaseCreated: (newCase: Case) => void;
}

interface ProcessingResult {
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  caseName?: string;
  findings?: CaseLoadFinding[];
  evidence?: Evidence;
  error?: string;
}

export const CaseLoadProcessor: React.FC<CaseLoadProcessorProps> = ({ cases, onUpdateCase, onCaseCreated }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (filesList: FileList | File[]) => {
    const files = Array.from(filesList).filter(f => f.name.match(/\.(txt|pdf|jpg|jpeg|png|doc|docx)$/i));
    if (files.length === 0) return;

    setIsProcessing(true);
    const newResults: ProcessingResult[] = files.map(f => ({
      fileName: f.name,
      status: 'pending'
    }));
    setResults(newResults);
    
    // Keep a local mutable copy of cases to avoid creating duplicates during the loop
    let currentCases = [...cases];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'processing' } : r));

      try {
        const reader = new FileReader();
        const fileContent = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsText(file);
        });

        const prompt = `
          Analyze this legal document for a "Case Load Processing" task.
          
          1. Identify the CASE NAME or ID this document belongs to.
          2. Identify the JURISDICTION (e.g., Multnomah County Circuit Court, Federal District Court of Oregon, Baker County Juvenile Court).
          3. Identify the applicable COURT RULES (e.g., UTCR, SLR, FRCP, ORS 419B).
          4. Classify the document type (exhibit, transcript, correspondence, pleading, other).
          5. Scan for "Unauthorized Information" (PII like SSNs, private addresses, or sensitive data that shouldn't be public).
          6. Scan for "Discrepancies" (contradictions with common legal standards or internal inconsistencies).
          7. Scan for "Violations" (potential violations of Oregon Revised Statutes (ORS) or court rules).
          8. If the case number starts with "J" (e.g., 23JU...), flag it as a Juvenile Dependency case.
          
          For each issue found, create a finding object.
          
          FILE CONTENT:
          ${fileContent.substring(0, 15000)}
        `;

        const response = await generateContentProxy({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                caseName: { type: Type.STRING },
                jurisdiction: { type: Type.STRING },
                courtRules: { type: Type.STRING },
                docType: { type: Type.STRING, enum: ['exhibit', 'transcript', 'correspondence', 'pleading', 'other'] },
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                date: { type: Type.STRING },
                findings: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      findingType: { type: Type.STRING, description: "e.g., Missing Signature, Date Mismatch, Legal Error, Unauthorized Info, Violation" },
                      severity: { type: Type.STRING, enum: ['High', 'Medium', 'Low', 'Critical'] },
                      description: { type: Type.STRING },
                      status: { type: Type.STRING, enum: ['Unresolved', 'Flagged', 'Resolved'] },
                      type: { type: Type.STRING, enum: ['unauthorized_info', 'discrepancy', 'violation'] },
                      violationType: { type: Type.STRING },
                      suggestedAction: { type: Type.STRING },
                      location: { type: Type.STRING }
                    },
                    required: ["findingType", "severity", "description", "status"]
                  }
                }
              },
              required: ["caseName", "jurisdiction", "courtRules", "docType", "title", "summary", "findings"]
            }
          },
        });

        const data = JSON.parse(response.text || '{}');
        
        const newEvidence: Evidence = {
          id: crypto.randomUUID(),
          title: data.title || file.name,
          type: data.docType || 'other',
          content: fileContent.substring(0, 15000), // Truncate to prevent payload size limits
          date: data.date,
          summary: data.summary,
          fileName: file.name,
          fileSize: (file.size / 1024).toFixed(1) + ' KB',
          tags: [data.docType],
          findings: []
        };

        // Auto-file logic
        let targetCaseIndex = currentCases.findIndex(c => 
          c.name.toLowerCase().includes(data.caseName.toLowerCase()) || 
          data.caseName.toLowerCase().includes(c.name.toLowerCase())
        );
        
        let targetCaseId = '';
        if (targetCaseIndex >= 0) {
          targetCaseId = currentCases[targetCaseIndex].id;
        } else {
          targetCaseId = `CASE-${Date.now()}-${i}`;
        }

        newEvidence.findings = data.findings.map((f: any) => ({ 
          ...f, 
          id: crypto.randomUUID(),
          caseId: targetCaseId,
          documentId: newEvidence.id
        }));

        setResults(prev => prev.map((r, idx) => idx === i ? { 
          ...r, 
          status: 'completed', 
          caseName: data.caseName, 
          findings: newEvidence.findings,
          evidence: newEvidence
        } : r));

        if (targetCaseIndex >= 0) {
          const targetCase = currentCases[targetCaseIndex];
          const updatedCase = { ...targetCase, evidence: [...targetCase.evidence, newEvidence] };
          currentCases[targetCaseIndex] = updatedCase;
          onUpdateCase(updatedCase);
        } else {
          const newCase: Case = {
            id: targetCaseId,
            name: data.caseName,
            jurisdiction: data.jurisdiction || 'Oregon (Auto-Detected)',
            courtRules: data.courtRules || 'ORS / UTCR',
            evidence: [newEvidence],
            claims: [],
            generatedDocs: {}
          };
          currentCases.push(newCase);
          onCaseCreated(newCase);
        }

      } catch (err: any) {
        setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'error', error: err.message } : r));
      }
    }
    setIsProcessing(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <FolderPlus className="w-5 h-5 text-orange-500" />
          <h2 className="text-xl font-serif italic text-zinc-100">Bulk Case Load Processor</h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
          <ShieldAlert className="w-3.5 h-3.5" />
          Auto-Filing & Violation Detection Active
        </div>
      </div>

      <div 
        className={cn(
          "relative h-64 border-2 border-dashed rounded-sm flex flex-col items-center justify-center transition-all duration-300",
          dragActive ? "border-orange-500 bg-orange-900/10" : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700",
          isProcessing && "opacity-50 pointer-events-none"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files);
            e.target.value = '';
          }}
          // @ts-ignore
          webkitdirectory=""
          directory=""
        />
        
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="p-4 bg-zinc-900 rounded-full border border-zinc-800">
            <Upload className="w-8 h-8 text-zinc-500" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-mono text-zinc-300">Upload Entire Case Load</p>
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">AI will scan, separate, and file documents automatically</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <File className="w-4 h-4" />
              Select Files
            </button>
            <button 
              onClick={() => folderInputRef.current?.click()}
              className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              Select Folder
            </button>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Processing Queue</span>
            <span className="text-[10px] font-mono text-zinc-600">{results.filter(r => r.status === 'completed').length} / {results.length} Completed</span>
          </div>
          
          <div className="space-y-2">
            {results.map((result, idx) => (
              <ProcessingItem key={idx} result={result} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ProcessingItem: React.FC<{ result: ProcessingResult }> = ({ result }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {result.status === 'processing' ? (
            <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
          ) : result.status === 'completed' ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : result.status === 'error' ? (
            <FileWarning className="w-4 h-4 text-red-500" />
          ) : (
            <File className="w-4 h-4 text-zinc-700" />
          )}
          <div>
            <p className="text-xs font-mono text-zinc-200">{result.fileName}</p>
            {result.caseName && (
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-tighter">Filed to: {result.caseName}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {result.findings && result.findings.length > 0 && (
            <div className="flex items-center gap-2 px-2 py-1 bg-red-900/20 border border-red-900/30 rounded-sm">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span className="text-[9px] font-mono text-red-400 uppercase">{result.findings.length} Findings</span>
            </div>
          )}
          {result.status === 'completed' && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-zinc-800 text-zinc-500 transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {isExpanded && result.findings && (
        <div className="border-t border-zinc-800 bg-zinc-950/50 p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Unauthorized Info & Discrepancy Report</span>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {result.findings.map((finding) => (
              <div key={finding.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-1.5 py-0.5 text-[8px] font-mono uppercase rounded-sm",
                      finding.type === 'unauthorized_info' ? "bg-red-900/40 text-red-400" :
                      finding.type === 'violation' ? "bg-orange-900/40 text-orange-400" :
                      "bg-blue-900/40 text-blue-400"
                    )}>
                      {finding.findingType || finding.type?.replace('_', ' ')}
                    </span>
                    <span className={cn(
                      "text-[8px] font-mono uppercase",
                      finding.severity === 'CRITICAL' || finding.severity === 'High' ? "text-red-500 font-bold" :
                      finding.severity === 'HIGH' || finding.severity === 'Medium' ? "text-orange-500" :
                      "text-zinc-500"
                    )}>
                      {finding.severity} Severity
                    </span>
                    {finding.status && (
                      <span className={cn(
                        "text-[8px] font-mono uppercase",
                        finding.status === 'Unresolved' ? "text-red-400" :
                        finding.status === 'Flagged' ? "text-orange-400" :
                        "text-green-400"
                      )}>
                        [{finding.status}]
                      </span>
                    )}
                  </div>
                  {finding.location && (
                    <span className="text-[8px] font-mono text-zinc-600 uppercase">{finding.location}</span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">{finding.description}</p>
                {finding.violationType && (
                  <div className="flex items-start gap-2 pt-1">
                    <FileWarning className="w-3 h-3 text-zinc-600 mt-0.5" />
                    <p className="text-[9px] font-mono text-zinc-500 italic">Violation: {finding.violationType}</p>
                  </div>
                )}
                {finding.suggestedAction && (
                  <div className="flex items-start gap-2 pt-1 border-t border-zinc-800 mt-2">
                    <Info className="w-3 h-3 text-blue-500 mt-0.5" />
                    <p className="text-[9px] font-mono text-blue-400">Suggested Action: {finding.suggestedAction}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
