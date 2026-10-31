import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  RefreshCcw,
  Mail,
  Send,
  Plus,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Inbox,
  User,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Trash2,
  FileCheck,
  Search,
  Sparkles,
  Paperclip
} from 'lucide-react';
import { getAccessToken, googleSignIn } from '../lib/authHelper';
import { Case, Evidence } from '../types';
import { generateContentProxy } from '../lib/geminiClient';

interface EmailMessage {
  id: string;
  threadId: string;
  source?: any;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  body?: string;
}

interface GmailIntegrationProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
}

export const GmailIntegration: React.FC<GmailIntegrationProps> = ({ activeCase, onUpdateCase }) => {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Compose window states
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  // UTILITY HELPER TO DECODE EMAIL HEADERS
  const getHeader = (headers: any[], name: string): string => {
    if (!headers) return '';
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  };

  // DECODE THE BASE64 GMAIL MESSAGE BODY
  const decodeGmailBody = (payload: any): string => {
    if (!payload) return '';
    if (payload.body && payload.body.data) {
      try {
        const base64 = payload.body.data.replace(/-/g, '+').replace(/_/g, '/');
        return decodeURIComponent(escape(atob(base64)));
      } catch (e) {
        return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          try {
            const base64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
            return decodeURIComponent(escape(atob(base64)));
          } catch (e) {
            return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
        }
      }
      for (const part of payload.parts) {
        if (part.body && part.body.data) {
          try {
            const base64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
            return decodeURIComponent(escape(atob(base64)));
          } catch (e) {
            return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
        }
        if (part.parts) {
          const nested = decodeGmailBody(part);
          if (nested) return nested;
        }
      }
    }
    return '';
  };

  // FETCH EMAILS FROM GMAIL
  const fetchEmails = async (usePrompt = false) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setNeedsAuth(false);
    
    try {
      let token = await getAccessToken();
      if (!token && usePrompt) {
        const result = await googleSignIn();
        if (result) token = result.accessToken;
      }

      if (!token) {
        setNeedsAuth(true);
        setIsLoading(false);
        return;
      }

      // Fetch messages IDs list
      const queryParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : '';
      const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10${queryParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!listRes.ok) {
        if (listRes.status === 401 || listRes.status === 403) {
          setNeedsAuth(true);
          return;
        }
        throw new Error(`Gmail API list returned status ${listRes.status}`);
      }

      const listData = await listRes.json();
      const messagesList = listData.messages || [];

      if (messagesList.length === 0) {
        setEmails([]);
        setIsLoading(false);
        return;
      }

      // Fetch detailed parts for each message in parallel
      const detailedEmails: EmailMessage[] = await Promise.all(
        messagesList.map(async (msg: { id: string; threadId: string }) => {
          try {
            const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (!msgRes.ok) return { id: msg.id, threadId: msg.threadId };
            const fullMsg = await msgRes.json();
            const headers = fullMsg.payload?.headers || [];
            
            return {
              id: msg.id,
              threadId: msg.threadId,
              source: fullMsg,
              subject: getHeader(headers, 'subject') || '(No Subject)',
              from: getHeader(headers, 'from') || 'Unknown Sender',
              to: getHeader(headers, 'to') || 'Me',
              date: getHeader(headers, 'date') || '',
              body: decodeGmailBody(fullMsg.payload)
            };
          } catch (e) {
            console.error('Error fetching deep email message details:', e);
            return { id: msg.id, threadId: msg.threadId };
          }
        })
      );

      setEmails(detailedEmails.filter(e => e.subject || e.body));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while fetching your emails.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails(false);
  }, [activeCase.id]);

  // LOGIN TRIGGER
  const handleLogin = async () => {
    try {
      setError(null);
      await googleSignIn();
      fetchEmails(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google authorization login failed.');
    }
  };

  // SEND AN EMAIL ON BEHALF OF THE USER
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !subject || !composeBody) {
      setError('Please provide all fields: Recipient, Subject, and Email Body.');
      return;
    }

    const confirmed = window.confirm(
      `Confirm Action: Send email to "${recipient}" with subject "${subject}"? This will deliver the message immediately.`
    );
    if (!confirmed) return;

    setIsSending(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        setIsSending(false);
        return;
      }

      // Build MIME email string
      const emailLines = [
        `To: ${recipient}`,
        'Content-Type: text/plain; charset=UTF-8',
        'MIME-Version: 1.0',
        `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
        '',
        composeBody
      ];
      const emailMime = emailLines.join('\r\n');
      const base64SafeMessage = btoa(unescape(encodeURIComponent(emailMime)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: base64SafeMessage })
      });

      if (!res.ok) {
        throw new Error(`Failed to transmit email. Server returned status: ${res.status}`);
      }

      setSuccess(`Email successfully delivered to "${recipient}"!`);
      // Reset compose state
      setRecipient('');
      setSubject('');
      setComposeBody('');
      fetchEmails(false); // Refresh list
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to deliver composed message.');
    } finally {
      setIsSending(false);
    }
  };

  // LOAD CONTEXT/TEMPLATES FROM CASE DIRECTLY INTO DRAFT BODY
  const loadCaseTemplate = (type: 'complaint' | 'motion' | 'toa' | 'research') => {
    if (type === 'research') {
      const researchSnippet = `Dear Client,\n\nHere are the critical judicial precedents and statutes discovered by our Automated Legal Research system regarding your active case "${activeCase.name}":\n\n` + 
        (activeCase.courtRules ? `Grounded Rules: ${activeCase.courtRules}\n\n` : '') +
        `We are utilizing these specific governing authorities to anchor the drafted arguments of our complaints and motion packages.\n\nBest regards,\nLegal Counsel Team`;
      setSubject(`Legal Precedents Research Summary: ${activeCase.name}`);
      setComposeBody(researchSnippet);
    } else if (type === 'complaint') {
      const complaintText = activeCase.generatedDocs.complaint || '';
      if (!complaintText) {
        alert('No draft of Complaint exists. Please run Manifold Reasoning to generate the document first.');
        return;
      }
      setSubject(`CASE REVIEW: Initial Complaint Draft for ${activeCase.name}`);
      setComposeBody(`Here is the initial Complaint document draft prepared for your review:\n\n${complaintText.substring(0, 1500)}...\n\n(See active Case Manager for full document)`);
    } else if (type === 'motion') {
      const motionText = activeCase.generatedDocs.motion || '';
      if (!motionText) {
        alert('No draft of Motion for Summary Judgment exists. Please generate the document first.');
        return;
      }
      setSubject(`ACTION REQUIRED: Motion for Summary Judgment Draft: ${activeCase.name}`);
      setComposeBody(`Please review the constructed Motion for Summary Judgment draft below:\n\n${motionText.substring(0, 1500)}...\n\n(See active Case Manager for full document)`);
    } else if (type === 'toa') {
      const toaText = activeCase.generatedDocs.toa || '';
      if (!toaText) {
        alert('No Table of Authorities is currently drafted for this case.');
        return;
      }
      setSubject(`Table of Authorities (TOA) Records check: ${activeCase.name}`);
      setComposeBody(`Table of Authorities associated with case filings:\n\n${toaText}`);
    }
  };

  // INGEST SELECTED EMAIL CONTENT IMMEDIATELY AS CORRESPONDENCE EVIDENCE
  const handleInjestAsEvidence = async (email: EmailMessage) => {
    const confirmIngest = window.confirm(
      `Confirm evidence ingestion: Import this email correspondence "${email.subject}" directly into the case's evidence log?`
    );
    if (!confirmIngest) return;

    setIsSummarizing(true);
    try {
      // Auto-summarize using Gemini Proxy!
      const userPrompt = `You are an elite legal co-counsel. Analyze and summarize the following client/opposing counsel email communication for inclusion into our digital litigation evidence packet:
      
      EMAIL DETAIL:
      Sender (From): ${email.from}
      Recipient (To): ${email.to}
      Sent Date: ${email.date}
      Subject: ${email.subject}
      
      EMAIL BODY CONTENT:
      """
      ${email.body || '(Empty email payload)'}
      """
      
      Generate a concise 1-paragraph summary stating the core admissions, disputes, timeline impact, or material representations made inside this communication. Highlight the evidentiary significance. No intro text, return ONLY the paragraph.`;

      let emailSummary = 'Imported email correspondence listing communication between relevant client and opposition members.';
      try {
        const aiResponse = await generateContentProxy({
          model: 'gemini-3.5-flash',
          contents: userPrompt
        });
        if (aiResponse && aiResponse.text) {
          emailSummary = aiResponse.text.trim();
        }
      } catch (sumErr) {
        console.warn('Gemini auto-summarize failed in email ingest, using generic fallback summary:', sumErr);
      }

      const generatedEvidence: Evidence = {
        id: `email-${email.id || Math.random().toString(36).substr(2, 9)}`,
        title: `Email correspondence: ${email.subject}`,
        type: 'correspondence',
        content: `FROM: ${email.from}\nTO: ${email.to}\nDATE: ${email.date}\nSUBJECT: ${email.subject}\n\n${email.body || ''}`,
        date: email.date ? new Date(email.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        summary: emailSummary,
        tags: ['GMAIL_SOURCE', 'CORRESPONDENCE', 'AUTO_INGESTED']
      };

      const updatedEvidenceList = [...activeCase.evidence, generatedEvidence];
      const updatedCase: Case = {
        ...activeCase,
        evidence: updatedEvidenceList,
        updatedAt: new Date().toISOString()
      };

      onUpdateCase(updatedCase);
      setSuccess(`Successfully ingested email correspondence as high-truth litigation evidence!`);
    } catch (ingestErr: any) {
      console.error(ingestErr);
      setError(`Failed to process and ingest email correspondence: ${ingestErr.message}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-serif italic text-zinc-100 flex items-center gap-2">
            <Mail className="w-5 h-5 text-orange-500 animate-pulse" />
            Gmail Workstation & Correspondence Sync
          </h2>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
            Browse correspondence feeds, ingest client emails into case evidence, and dispatch legal files
          </p>
        </div>
        <div className="flex items-center gap-3">
          <form 
            onSubmit={(e) => { e.preventDefault(); fetchEmails(false); }}
            className="relative flex items-center"
          >
            <input
              type="text"
              placeholder="Search labels or key text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-mono pl-8 pr-3 py-1.5 focus:outline-none focus:border-zinc-650 rounded-sm w-52"
            />
            <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-2.5" />
          </form>
          
          <button
            onClick={() => fetchEmails(true)}
            disabled={isLoading}
            className="px-4 py-2 border border-zinc-800 text-[10px] font-mono text-zinc-400 uppercase tracking-widest hover:text-zinc-100 hover:border-zinc-500 transition-all flex items-center gap-2 bg-zinc-900"
          >
            {isLoading ? <Loader2 className="w-3 h-3 text-orange-500 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
            Sync
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-900/50 text-red-400 text-xs font-mono flex items-start gap-3 rounded-lg">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-950/20 border border-green-900/50 text-green-400 text-xs font-mono flex items-start gap-3 rounded-lg">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>{success}</div>
        </div>
      )}

      {needsAuth ? (
        <div className="p-12 text-center border flex flex-col items-center border-dashed border-zinc-800 bg-zinc-900/40 rounded">
          <Mail className="w-10 h-10 text-zinc-750 mb-4" />
          <h3 className="text-sm font-mono text-zinc-300 uppercase tracking-widest mb-2">Gmail Authorization Required</h3>
          <p className="text-xs text-zinc-500 mb-6 max-w-sm">
            Connect your Google account with Mail permission to read case emails, ingest transcripts, or forward completed motion files.
          </p>
          <button
            onClick={handleLogin}
            className="px-6 py-2.5 bg-orange-650 hover:bg-orange-500 text-white font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-2 rounded-sm"
          >
            <Mail className="w-4 h-4" />
            Authorize Gmail Node
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: EMAIL LISTINGS FEEDS */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-1.5">
                <Inbox className="w-3.5 h-3.5 text-zinc-500" />
                Latest Inbox (Max 10)
              </span>
              <span className="text-[9px] font-mono text-zinc-500">REALTIME CLIENT COMMS</span>
            </div>

            {isLoading ? (
              <div className="py-24 border border-zinc-850 bg-zinc-950/20 flex flex-col items-center justify-center space-y-3 text-zinc-500 rounded">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                <p className="text-[10px] font-mono tracking-wider uppercase">Streaming messages from mail server...</p>
              </div>
            ) : emails.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-zinc-850 rounded text-zinc-600 font-mono text-xs uppercase tracking-wider bg-zinc-950/20">
                No legal mail matching context found.
              </div>
            ) : (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {emails.map(email => {
                  const isSelected = selectedEmail?.id === email.id;
                  return (
                    <div 
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={`p-3.5 border transition-all duration-150 cursor-pointer text-left rounded ${
                        isSelected 
                          ? 'bg-zinc-900 border-orange-500/70 shadow-lg shadow-orange-950/10' 
                          : 'bg-zinc-950 border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5 mb-1.5">
                        <span className="text-[10.5px] font-mono font-bold text-zinc-300 line-clamp-1">
                          {email.from}
                        </span>
                        <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-zinc-500 shrink-0">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{email.date ? new Date(email.date).toLocaleDateString() : ''}</span>
                        </div>
                      </div>
                      
                      <h4 className="text-xs text-zinc-100 font-medium truncate mb-1">
                        {email.subject}
                      </h4>
                      <p className="text-[10.5px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {email.body ? email.body.substring(0, 160) : '(No plain-text version found)'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: EMAIL DETAIL & COMPOSER */}
          <div className="lg:col-span-6 space-y-6">
            {/* EMAIL VIEWER PANEL */}
            {selectedEmail ? (
              <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-lg space-y-4 flex flex-col justify-between min-h-[280px]">
                <div>
                  <div className="flex items-start justify-between border-b border-zinc-850 pb-3 gap-2">
                    <div>
                      <div className="text-[9px] font-mono uppercase tracking-widest text-orange-400 font-bold mb-1">Email Viewer Node</div>
                      <h3 className="text-xs font-mono font-bold text-zinc-150 leading-snug">{selectedEmail.subject}</h3>
                      <div className="text-[10px] text-zinc-400 font-mono mt-1.5 flex flex-col gap-0.5">
                        <span className="flex items-center gap-1"><User className="w-3 h-3 text-zinc-650" /> FROM: {selectedEmail.from}</span>
                        <span>TO: {selectedEmail.to}</span>
                        <span>DATE: {selectedEmail.date}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedEmail(null)}
                      className="text-[9px] font-mono text-zinc-500 hover:text-zinc-350 uppercase"
                    >
                      Close [X]
                    </button>
                  </div>
                  
                  <div className="mt-4 text-[11px] text-zinc-350 leading-relaxed font-sans whitespace-pre-wrap max-h-52 overflow-y-auto pr-1 bg-zinc-900/40 p-3 rounded border border-zinc-900">
                    {selectedEmail.body || '(Plaintext body not found - HTML message source detected)'}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-850 mt-2">
                  <div className="text-[9px] font-mono text-zinc-500 uppercase">
                    IMPORT NODE READY
                  </div>
                  <button
                    onClick={() => handleInjestAsEvidence(selectedEmail)}
                    disabled={isSummarizing}
                    className="px-3.5 py-1.5 border border-orange-700/60 bg-orange-950/20 text-[9.5px] font-mono text-orange-400 uppercase tracking-widest hover:bg-orange-950/55 hover:border-orange-500 transition-all flex items-center gap-1.5 rounded"
                  >
                    {isSummarizing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Ingesting & Summarizing...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Ingest into Case Evidence
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-950 border border-zinc-850 p-6 rounded-lg text-center font-mono text-[10.5px] text-zinc-550 uppercase tracking-wider flex flex-col items-center justify-center min-h-[220px]">
                <Mail className="w-6 h-6 text-zinc-800 mb-2 animate-bounce" />
                Select an legal email to view details or ingest into Case Evidence
              </div>
            )}

            {/* SEND / COMPOSER FORM PANEL */}
            <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-lg space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-1.5">
                  <Send className="w-3 h-3 text-emerald-500" />
                  Legal Outbox Composer
                </span>
                <span className="text-[8px] font-mono text-zinc-500 uppercase bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                  Secure SMTP Sync
                </span>
              </div>

              {/* QUICK INSERT TEMPLATE SELECTS */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono text-zinc-500 uppercase block">Quick Load Generated Case Document Drafts:</label>
                <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                  <button
                    type="button"
                    onClick={() => loadCaseTemplate('complaint')}
                    className="p-1.5 border border-zinc-850 hover:border-zinc-650 bg-zinc-900 text-left text-zinc-400 hover:text-zinc-100 truncate rounded"
                  >
                    [Insert] Original Complaint Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => loadCaseTemplate('motion')}
                    className="p-1.5 border border-zinc-850 hover:border-zinc-650 bg-zinc-900 text-left text-zinc-400 hover:text-zinc-100 truncate rounded"
                  >
                    [Insert] Motion for Summary Judgment
                  </button>
                  <button
                    type="button"
                    onClick={() => loadCaseTemplate('toa')}
                    className="p-1.5 border border-zinc-850 hover:border-zinc-650 bg-zinc-900 text-left text-zinc-400 hover:text-zinc-100 truncate rounded"
                  >
                    [Insert] Table of Authorities
                  </button>
                  <button
                    type="button"
                    onClick={() => loadCaseTemplate('research')}
                    className="p-1.5 border border-emerald-900/60 bg-emerald-950/10 hover:border-emerald-600 text-left text-emerald-400 hover:text-emerald-300 truncate rounded"
                  >
                    [Insert] Auto Legal Precedents findings
                  </button>
                </div>
              </div>

              <form onSubmit={handleSendEmail} className="space-y-3 font-mono text-[10.5px]">
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-550 uppercase">Recipient (To):</label>
                    <input
                      type="email"
                      required
                      placeholder="opposing_counsel@courts.gov or client@email.com"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-zinc-600 text-zinc-200 p-2 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-550 uppercase">Subject Heading:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Demand Notice and Complaint Service"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-zinc-600 text-zinc-200 p-2 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-550 uppercase">Email message body:</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Composed message content..."
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-zinc-600 text-zinc-200 p-2 text-xs font-sans min-h-[140px] leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-850 pt-3">
                  <div className="flex items-center gap-1 text-[9px] text-zinc-500">
                    <Paperclip className="w-3.5 h-3.5" /> Ready for Transmissions
                  </div>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-5 py-2 border border-emerald-800 hover:border-emerald-500 bg-emerald-950/20 text-emerald-400 uppercase tracking-wider font-bold hover:bg-emerald-950/45 text-xs transition-all flex items-center gap-1.5 rounded-sm cursor-pointer"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Dispatching...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" /> Dispatch Mail
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
