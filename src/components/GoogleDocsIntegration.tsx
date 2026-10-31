import React, { useState, useEffect } from 'react';
import { FileText, Loader2, RefreshCw, AlertCircle, Search, ExternalLink, Download } from 'lucide-react';
import { getAccessToken, googleSignIn } from '../lib/authHelper';
import { Case } from '../types';

interface DocumentFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
}

export const GoogleDocsIntegration: React.FC<{ activeCase: Case }> = ({ activeCase }) => {
  const [docs, setDocs] = useState<DocumentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const fetchDocs = async (usePrompt = false) => {
    setLoading(true);
    setError(null);
    try {
      let token = await getAccessToken();
      if (!token && usePrompt) {
        const result = await googleSignIn();
        if (result) token = result.accessToken;
      }
      
      if (!token) {
        setNeedsAuth(true);
        setLoading(false);
        return;
      }

      setNeedsAuth(false);
      
      // Fetch only Google Docs
      const res = await fetch("https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.document'&orderBy=modifiedTime desc&pageSize=15&fields=files(id,name,mimeType,modifiedTime,webViewLink)", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) setNeedsAuth(true);
        throw new Error(await res.text() || "Failed to fetch Google Docs");
      }
      
      const data = await res.json();
      setDocs(data.files || []);
    } catch (err: any) {
      if (
        err.code !== 'auth/popup-closed-by-user' &&
        err.code !== 'auth/cancelled-popup-request' &&
        err.code !== 'auth/popup-blocked'
      ) {
        console.error(err);
      }
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs(false);
  }, [activeCase.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-serif italic text-zinc-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Google Docs Integration
          </h2>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
            Access and link your external document artifacts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDocs(true)}
            disabled={loading}
            className="px-4 py-2 border border-zinc-800 text-[10px] font-mono text-zinc-400 uppercase tracking-widest hover:text-zinc-100 hover:border-zinc-600 transition-all flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh Docs
          </button>
        </div>
      </div>

      {error && !needsAuth && (
        <div className="p-4 bg-red-900/20 border border-red-900/50 text-red-400 text-xs font-mono flex items-start gap-3">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <div className="break-all">{error}</div>
        </div>
      )}

      {needsAuth ? (
        <div className="p-12 text-center border items-center flex flex-col border-dashed border-zinc-800 bg-zinc-900/50">
          <FileText className="w-8 h-8 text-zinc-600 mb-4" />
          <h3 className="text-sm font-mono text-zinc-300 uppercase tracking-widest mb-2">Google Account Access Required</h3>
          <p className="text-xs text-zinc-500 mb-6 max-w-md">
            Connect your Google account to read, link, and export Google Docs associated with your active cases.
          </p>
          <button
            onClick={() => fetchDocs(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Sign in with Google Docs
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {docs.length === 0 && !loading && !error ? (
            <div className="text-center py-12 text-zinc-600 font-mono text-xs uppercase tracking-widest">
              No recent Google Docs found.
            </div>
          ) : (
            docs.map(doc => (
              <div key={doc.id} className="p-4 bg-zinc-900 border border-zinc-800 flex items-center justify-between group hover:border-zinc-700 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/10 flex items-center justify-center rounded">
                    <FileText className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-mono text-zinc-200 truncate max-w-md">{doc.name}</h4>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase">
                      Modified {new Date(doc.modifiedTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={doc.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
                    title="Open in Google Docs"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
