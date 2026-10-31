import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  RefreshCcw,
  Book,
  FileText,
  AlertCircle,
  Plus
} from 'lucide-react';
import { getAccessToken, googleSignIn } from '../lib/authHelper';
import { Case } from '../types';

export const GoogleKeepIntegration: React.FC<{ activeCase: Case }> = ({ activeCase }) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const fetchNotes = async () => {
    setIsLoading(true);
    setError(null);
    setNeedsAuth(false);
    
    try {
      const token = await getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        setIsLoading(false);
        return;
      }

      const res = await fetch('https://keep.googleapis.com/v1/notes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setNeedsAuth(true);
          throw new Error('Authentication required. Missing token or scopes.');
        }
        throw new Error(`API returned ${res.status}`);
      }
      
      const data = await res.json();
      setNotes(data.notes || []);
    } catch (err: any) {
      if (
        err.code !== 'auth/popup-closed-by-user' &&
        err.code !== 'auth/cancelled-popup-request' &&
        err.code !== 'auth/popup-blocked'
      ) {
        console.error(err);
      }
      setError(err.message || 'Failed to fetch notes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [activeCase.id]);

  const handleLogin = async () => {
    try {
      await googleSignIn();
      fetchNotes();
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('popup-closed-by-user')) {
        setError('Google authorization popup was closed before completion. If you clicked away, please click again to log in.');
      } else if (msg.includes('popup-blocked')) {
        setError('Authorization popup was blocked by your browser. Please enable popups or access the standalone page link.');
      } else {
        setError(msg || 'Failed to login');
      }
    }
  };

  const handleCreateNoteFromCase = async () => {
    if (!window.confirm("Export case overview to Google Keep?")) {
      return;
    }
    
    setIsLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        return;
      }
      
      const payload = {
        title: `Legal Manifold Case: ${activeCase.name}`,
        body: {
          text: {
            text: `Jurisdiction: ${activeCase.jurisdiction}\nEvidence Count: ${activeCase.evidence.length}\nClaims Count: ${activeCase.claims.length}`
          }
        }
      };

      const res = await fetch('https://keep.googleapis.com/v1/notes', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      
      await fetchNotes();
    } catch (err: any) {
      if (
        err.code !== 'auth/popup-closed-by-user' &&
        err.code !== 'auth/cancelled-popup-request' &&
        err.code !== 'auth/popup-blocked'
      ) {
        console.error(err);
      }
      setError(err.message || 'Failed to create note');
      setIsLoading(false);
    }
  };

  const handleDeleteNote = async (id: string, name: string) => {
    if (!window.confirm(`Delete the note "${id}" from Google Keep? This action cannot be undone.`)) {
      return;
    }
    
    setIsLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        return;
      }
      const res = await fetch(`https://keep.googleapis.com/v1/${name}`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      
      await fetchNotes();
    } catch (err: any) {
      if (
        err.code !== 'auth/popup-closed-by-user' &&
        err.code !== 'auth/cancelled-popup-request' &&
        err.code !== 'auth/popup-blocked'
      ) {
        console.error(err);
      }
      setError(err.message || 'Failed to delete note');
      setIsLoading(false);
    }
  };

  if (needsAuth) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-400 space-y-6 max-w-xl mx-auto border border-zinc-900 rounded-sm bg-zinc-950/40 font-sans">
        <Book className="w-12 h-12 text-zinc-600 mb-2" />
        <h2 className="text-lg font-serif italic text-white text-center">Google Keep Integration</h2>
        <p className="text-xs text-zinc-400 text-center leading-relaxed font-mono">
          THE LEGAL MANIFOLD PLATFORM REQUIRES EXPLICIT AUTHORIZATION TO SYNC NOTES WITH YOUR GOOGLE KEEP ACCOUNT.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
          <button
            onClick={handleLogin}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-zinc-950 rounded-sm hover:bg-zinc-200 transition-colors font-bold text-xs cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Authorize Keep Notes
          </button>
          
          <button
            onClick={() => window.open(window.location.href, '_blank')}
            className="flex-1 text-center py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 font-mono text-[10px] tracking-wider uppercase rounded-sm transition-all cursor-pointer"
          >
            Launch Standalone Tab ↗
          </button>
        </div>

        {error && (
          <div className="space-y-3 w-full">
            <div className="p-3.5 bg-red-950/20 border border-red-900/30 text-red-400 text-xs font-mono rounded-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block uppercase text-[10px]">Authorization Timeout or Failed:</span>
                <span className="text-zinc-300 leading-relaxed block">{error}</span>
              </div>
            </div>

            {(error.includes('popup-closed-by-user') || error.includes('popup') || error.includes('cookie') || error.includes('cancelled')) && (
              <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-sm text-[11px] text-zinc-400 leading-relaxed font-mono space-y-2">
                <p className="text-orange-500 font-bold uppercase text-[9px]">⚠️ Third-Party Iframe Block detected</p>
                <p>
                  Browsers (like Safari & Chrome) automatically disable popups and cross-origin auth credentials inside embedded simulators.
                </p>
                <p className="text-zinc-500">
                  Please click <strong className="text-zinc-300">"Launch Standalone Tab ↗"</strong> to open this application in a direct primary tab—Google Keep authentication will perform instantly.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
        <div className="flex items-center gap-3">
          <Book className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-serif italic text-zinc-100">Google Keep Intersect</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={fetchNotes}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-sm hover:border-zinc-700 hover:text-zinc-200 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
            Refresh
          </button>
          
          <button
            onClick={handleCreateNoteFromCase}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono text-orange-500 bg-orange-950/20 border border-orange-900/40 rounded-sm hover:bg-orange-950/40 hover:text-orange-400 transition-all cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Export Case to Keep
          </button>
        </div>
      </div>
      
      {error && (
        <div className="p-4 bg-red-950/20 border border-red-900/30 text-red-400 text-xs font-mono flex items-center gap-3 rounded-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notes.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 text-zinc-600 border border-dashed border-zinc-900 rounded-sm bg-zinc-950/20">
          <FileText className="w-8 h-8 mb-4 opacity-50" />
          <p className="text-sm font-serif italic">No notes found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((note) => (
            <div key={note.name} className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-sm flex flex-col justify-between group">
              <div>
                <h3 className="text-sm font-bold text-zinc-200 mb-2 leading-tight">
                  {note.title || '(Untitled Note)'}
                </h3>
                <p className="text-xs text-zinc-400 whitespace-pre-wrap font-sans mb-4">
                  {note.body?.text?.text}
                </p>
                {note.body?.list?.listItems?.length > 0 && (
                  <ul className="list-disc pl-5 text-xs text-zinc-400 mb-4 space-y-1">
                    {note.body.list.listItems.map((item: any, i: number) => (
                      <li key={i} className={item.checked ? "line-through opacity-50" : ""}>
                        {item.text?.text?.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex justify-end pt-4 mt-auto border-t border-zinc-800/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDeleteNote(note.name, note.name)}
                  className="text-[10px] font-mono text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-widest cursor-pointer"
                >
                  Delete via Keep API
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
