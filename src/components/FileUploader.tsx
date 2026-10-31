import React, { useState, useRef } from 'react';
import { Evidence } from '../types';
import { Upload, File, Loader2, AlertCircle, X, CheckCircle2, FileText, Image as ImageIcon, FileCode, FolderOpen } from 'lucide-react';
import { cn } from '../lib/utils';

interface FileUploaderProps {
  onEvidenceAdded: (evidence: Evidence) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onEvidenceAdded }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: File[]) => {
    setIsUploading(true);
    setError(null);

    for (const file of files) {
      try {
        // Skip unsupported files if they come from a folder
        if (!file.name.match(/\.(txt|pdf|jpg|jpeg|png|doc|docx)$/i)) {
          continue;
        }

        const reader = new FileReader();
        
        const fileContent = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = (e) => reject(e);
          
          if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
          } else {
            reader.readAsText(file);
          }
        });

        // Call the server-side analysis endpoint which processes text and auto-tags the content
        const apiResponse = await fetch("/api/evidence/analyze-legacy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: fileContent,
            fileType: file.type,
          }),
        });

        if (!apiResponse.ok) {
          const errText = await apiResponse.json().catch(() => ({}));
          throw new Error(errText.error || `Server returned error status ${apiResponse.status}`);
        }

        const metadata = await apiResponse.json();
        
        const newEvidence: Evidence = {
          id: crypto.randomUUID(),
          title: metadata.title || file.name,
          type: metadata.category || 'other',
          content: fileContent,
          date: metadata.date || '',
          summary: metadata.summary || '',
          fileName: file.name,
          fileSize: (file.size / 1024).toFixed(1) + ' KB',
          tags: metadata.tags && metadata.tags.length > 0 ? metadata.tags : [metadata.category || 'other']
        };

        onEvidenceAdded(newEvidence);
      } catch (err: any) {
        setError(prev => (prev ? prev + "\n" : "") + `Failed to process ${file.name}: ` + (err.message || "Unknown error"));
      }
    }
    
    setIsUploading(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
    // Reset input so the same files/folder can be selected again
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div 
        className={cn(
          "relative h-48 border-2 border-dashed rounded-sm flex flex-col items-center justify-center transition-all duration-300",
          dragActive ? "border-orange-500 bg-orange-900/10" : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700",
          isUploading && "opacity-50 pointer-events-none"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept=".txt,.pdf,.jpg,.jpeg,.png,.doc,.docx"
          multiple
        />
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          // @ts-ignore
          webkitdirectory=""
          directory=""
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">AI Analyzing Documents...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center px-6">
            <div className="p-3 bg-zinc-900 rounded-full border border-zinc-800">
              <Upload className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-mono text-zinc-300">Drag & drop legal files or folders here</p>
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">PDF, TXT, Images (Max 10MB)</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[9px] uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                <FileText className="w-3 h-3" />
                Browse Files
              </button>
              <button 
                onClick={() => folderInputRef.current?.click()}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[9px] uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                <FolderOpen className="w-3 h-3" />
                Browse Folder
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-900/20 border border-red-900/50 text-red-400 text-[10px] font-mono flex items-center gap-3 whitespace-pre-wrap">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="shrink-0"><X className="w-3 h-3" /></button>
        </div>
      )}
    </div>
  );
};
