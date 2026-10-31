import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  Trash2, 
  Sparkles, 
  Search, 
  Zap, 
  Brain, 
  User, 
  Bot, 
  Loader2, 
  Activity, 
  Info, 
  FileText,
  HelpCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateContentProxy } from '../lib/geminiClient';
import { Case } from '../types';
import { cn } from '../lib/utils';

// Predefined Co-Counsel Roles with role-specific system instructions
const CHATBOT_ROLES = {
  OR_SPECIALIST: {
    id: 'OR_SPECIALIST',
    title: 'Statute & UTCR Specialist',
    description: 'Specializes in Oregon Revised Statutes (ORS), Uniform Trial Court Rules (UTCR), and Supplemental Local Rules (SLR). Precise citations.',
    icon: <Sparkles className="w-4 h-4 text-orange-500" />,
    systemInstruction: `You are an elite Oregon Legal Specialist. Your primary responsibility is to analyze legal issues with extreme precision according to Oregon Revised Statutes (ORS), Uniform Trial Court Rules (UTCR), and local Supplemental Court Rules (SLR). 

Follow these professional principles:
1. Address the user. Keep explanations concise, practical, and highly relevant.
2. Whenever discussing Oregon law, search for and point to specific ORS chapters/sections (e.g., ORS 107.135 for custody modification, ORS 12.110 for tort statute of limitations) or court rules.
3. Avoid hypothetical jargon; focus on concrete procedural requirements for Pro Se litigants.
4. Present legal steps systematically and logically.`
  },
  TACTICIAN: {
    id: 'TACTICIAN',
    title: 'Procedural Tactician',
    description: 'Master of multi-step courtroom tactics, discovery operations, and state/federal motion deadlines.',
    icon: <Zap className="w-4 h-4 text-yellow-500" />,
    systemInstruction: `You are an elite legal strategist and litigation tactician. You specialize in civil court procedure, motion timelines, filings, discovery devices (admissions, production, interrogatories), and hearings.

Your duties include:
1. Deconstruct legal conflicts into actionable steps.
2. Formulate powerful state or federal tactics (e.g., Demurring, Moving for Summary Judgment, filing a Motion to Compel discovery).
3. Outline detailed timelines and countdown sequences for filing opposing declarations or replies.
4. Emphasize compliance rules and jurisdictional requirements.`
  },
  DRAFTING_ASSISTANT: {
    id: 'DRAFTING_ASSISTANT',
    title: 'Document & Draft Assistant',
    description: 'Expert in preparing, structuring, and polishing formal pleadings, motions, and declarations.',
    icon: <FileText className="w-4 h-4 text-emerald-500" />,
    systemInstruction: `You are an expert legal drafter and document assistant. Your task is to assist the user in drafting, formatting, refining, and polishing legal documents, pleadings, declarations, and notices in formal pleading paper formats.

Focus on:
1. Translating the user's messy notes into neat, structured litigation paragraphs.
2. Advising on proper introductory and concluding clauses.
3. Suggesting logical groupings and sections for affidavits, exhibits, or supporting briefs.
4. Correcting grammatical and stylistic flaws for courtroom reading.`
  },
  CO_COUNSEL: {
    id: 'CO_COUNSEL',
    title: 'Humane General Co-Counsel',
    description: 'A comforting, direct assistant explaining complex legalese into digestible steps.',
    icon: <Brain className="w-4 h-4 text-blue-500" />,
    systemInstruction: `You are an empathetic, highly analytical generalist Co-Counsel. Your mission is to provide support for a self-represented litigant facing stressful legal situations.

Make sure you:
1. Explain complex legalese into readable, simple, non-patronizing english.
2. Reassure the user while keeping legal advice 100% rigorous.
3. Provide strategic clarity on evidentiary burdens and how to build a trial notebook.
4. Outline both strengths and dangerous risks of their claims.`
  }
};

type RoleId = keyof typeof CHATBOT_ROLES;

// Predefined AI Engines/Modes
const ENGINES = {
  BALANCED: {
    id: 'BALANCED',
    name: 'General Balanced',
    model: 'gemini-3.5-flash',
    description: 'Quick, high-capability general model ideal for most legal explanations.',
    icon: <Sparkles className="w-4 h-4 text-zinc-400" />
  },
  LOW_LATENCY: {
    id: 'LOW_LATENCY',
    name: '⚡ Ultra-Fast Lite',
    model: 'gemini-3.1-flash-lite',
    description: 'Extremely fast response speeds. Ideal for quick questions or spelling corrections.',
    icon: <Zap className="w-4 h-4 text-orange-400" />
  },
  SEARCH_GROUNDED: {
    id: 'SEARCH_GROUNDED',
    name: '🔍 Web-Search Grounded',
    model: 'gemini-3.5-flash',
    description: 'Uses active Google Search Grounding to get up-to-date Oregon legalese and schedules.',
    icon: <Search className="w-4 h-4 text-cyan-400" />
  },
  HIGH_THINKING: {
    id: 'HIGH_THINKING',
    name: '🧠 High Thinking',
    model: 'gemini-3.1-pro-preview',
    description: 'Deploys deep thinking capabilities for complicated legal strategy or critical analysis.',
    icon: <Brain className="w-4 h-4 text-purple-400" />
  }
};

type EngineId = keyof typeof ENGINES;

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface CoCounselChatProps {
  activeCase: Case;
  onUpdateCase: (updatedCase: Case) => void;
}

export function CoCounselChat({ activeCase, onUpdateCase }: CoCounselChatProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(`co_counsel_chat_${activeCase.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    }
    return [
      {
        id: 'welcome',
        role: 'model',
        text: `Greetings, Counsel. I am your specialized Co-Counsel agent configured for **${activeCase.name}**.\n\nSelect an **Agent Role** on the left to specialize my behavioral system instructions, and choose an **AI Engine** based on your timeline or analytical complexity.\n\nHow should we build your casework argument today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [input, setInput] = useState('');
  const [activeRole, setActiveRole] = useState<RoleId>('OR_SPECIALIST');
  const [activeEngine, setActiveEngine] = useState<EngineId>('BALANCED');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animated indicator variables for "HIGH_THINKING"
  const [curvature, setCurvature] = useState(0.4);
  const [sweBench, setSweBench] = useState(0);
  const [hleScore, setHleScore] = useState(0);
  const [entropy, setEntropy] = useState(1);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to lowest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Persist messages per case
  useEffect(() => {
    localStorage.setItem(`co_counsel_chat_${activeCase.id}`, JSON.stringify(messages));
  }, [messages, activeCase.id]);

  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear your conversation history for this case?")) {
      const initialMessage: Message = {
        id: `welcome-${Date.now()}`,
        role: 'model',
        text: `Conversation history cleared. I am ready to begin a new thread configured as your **${CHATBOT_ROLES[activeRole].title}**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([initialMessage]);
      setError(null);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isSending) return;

    const userText = input.trim();
    setInput('');
    setError(null);

    const userMessage: Message = {
      id: `m-${Date.now()}`,
      role: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setIsSending(true);

    // Initializing thinking states for HIGH_THINKING mode
    if (activeEngine === 'HIGH_THINKING') {
      setCurvature(0.5);
      setSweBench(82.6);
      setHleScore(48.9);
      setEntropy(0.95);
    }

    const timer = setInterval(() => {
      setCurvature(prev => Math.min(prev + 0.08, 0.94));
      setEntropy(prev => Math.max(prev - 0.1, 0.15));
    }, 400);

    try {
      // Build full conversation payload formatted for Google GenAI SDK contents
      // Always exclude the initial welcoming message to keep the history compact
      const conversationHistory = messages
        .filter(msg => msg.id !== 'welcome' && !msg.id.startsWith('welcome'))
        .map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }));

      // Append current message
      conversationHistory.push({
        role: 'user',
        parts: [{ text: userText }]
      });

      // Construct config
      const engineDetails = ENGINES[activeEngine];
      const selectedRole = CHATBOT_ROLES[activeRole];

      const config: any = {
        systemInstruction: selectedRole.systemInstruction,
      };

      // Apply low-latency/Lite conditions
      if (activeEngine === 'SEARCH_GROUNDED') {
        config.tools = [{ googleSearch: {} }];
      }

      // Apply thinking constraints (gemini-3.1-pro-preview + high thinking level + no maxOutputTokens)
      if (activeEngine === 'HIGH_THINKING') {
        config.thinkingConfig = { thinkingLevel: "HIGH" };
      }

      const response = await generateContentProxy({
        model: engineDetails.model,
        contents: conversationHistory,
        config: config
      });

      const responseText = response.text || "No response text found.";

      setMessages(prev => [...prev, {
        id: `m-${Date.now()}`,
        role: 'model',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

    } catch (err: any) {
      console.error('[CHAT ENGINE] Failed to generate response:', err);
      setError(err.message || "An unexpected legal reasoning error occurred. Please try again.");
    } finally {
      clearInterval(timer);
      setIsSending(false);
    }
  };

  // Pre-load active case data contexts into user's chat space!
  const injectCaseContext = () => {
    let contextStr = `Here is our active case context:\n\nCase Name: ${activeCase.name}\nJurisdiction: ${activeCase.jurisdiction || 'Unassigned'}\n\n`;
    
    if (activeCase.claims.length > 0) {
      contextStr += `Claims in pleadings:\n`;
      activeCase.claims.forEach((claim, idx) => {
        contextStr += `- ${idx + 1}: ${claim.title}. Details: ${claim.description}\n`;
      });
      contextStr += `\n`;
    }

    if (activeCase.evidence.length > 0) {
      contextStr += `Evidence Items Available:\n`;
      activeCase.evidence.forEach((ev) => {
        contextStr += `- [${ev.type}] ${ev.title}: ${ev.summary || 'No summary available'}\n`;
      });
      contextStr += `\n`;
    }

    contextStr += `Please analyze this case posture and propose our next strategic action.`;
    setInput(contextStr);
  };

  return (
    <div className="flex flex-col xl:flex-row h-[750px] bg-zinc-950 border border-zinc-900 rounded-sm overflow-hidden" id="co-counsel-chat-container">
      {/* Sidebar: Role and Engine Configuration */}
      <div className="w-full xl:w-80 border-b xl:border-b-0 xl:border-r border-zinc-900 bg-zinc-950/40 p-5 space-y-6 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          <div>
            <span className="text-[10px] font-mono text-orange-500 uppercase tracking-widest font-bold">1. Select Case Role</span>
            <p className="text-[10px] text-zinc-500 font-mono mt-1">Specializes system context alignment</p>
            <div className="space-y-2 mt-3">
              {(Object.keys(CHATBOT_ROLES) as RoleId[]).map((key) => {
                const role = CHATBOT_ROLES[key];
                const isSelected = activeRole === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveRole(key)}
                    className={cn(
                      "w-full text-left p-3 border rounded-sm transition-all focus:outline-none flex flex-col gap-1.5 cursor-pointer",
                      isSelected 
                        ? "bg-orange-950/10 border-orange-500/40 text-orange-200" 
                        : "bg-zinc-900/40 border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {role.icon}
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider">{role.title}</span>
                    </div>
                    <span className="text-[9px] leading-relaxed font-mono text-zinc-500 group-hover:text-zinc-400">
                      {role.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-zinc-900 pt-5">
            <span className="text-[10px] font-mono text-orange-500 uppercase tracking-widest font-bold">2. Choose Reasoning Engine</span>
            <p className="text-[10px] text-zinc-500 font-mono mt-1">Switches model processing and mode features</p>
            <div className="space-y-2 mt-3">
              {(Object.keys(ENGINES) as EngineId[]).map((key) => {
                const engine = ENGINES[key];
                const isSelected = activeEngine === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveEngine(key)}
                    className={cn(
                      "w-full text-left p-3 border rounded-sm transition-all focus:outline-none flex items-center justify-between cursor-pointer",
                      isSelected 
                        ? "bg-zinc-900 border-zinc-700 text-zinc-100" 
                        : "bg-zinc-900/20 border-zinc-900 hover:border-zinc-800 text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    <div className="flex flex-col gap-0.5 max-w-[85%]">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider">{engine.name}</span>
                      <span className="text-[8px] font-mono text-zinc-650 opacity-80 truncate">{engine.description}</span>
                    </div>
                    {engine.icon}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-900 pt-5 mt-auto space-y-3">
          <button
            onClick={injectCaseContext}
            className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono text-zinc-300 hover:text-zinc-100 rounded-sm border border-zinc-800 hover:border-zinc-700 transition-all uppercase tracking-wider font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Brain className="w-3.5 h-3.5 text-orange-500" />
            Inject Case Context
          </button>
          <button
            onClick={clearChat}
            className="w-full py-2 text-[10px] font-mono text-zinc-600 hover:text-red-400 transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Chat History
          </button>
        </div>
      </div>

      {/* Main Chat Thread area */}
      <div className="flex-1 flex flex-col bg-zinc-950">
        {/* Chat Header Status Bar */}
        <div className="h-14 border-b border-zinc-900 px-6 flex items-center justify-between bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-orange-600 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold text-zinc-200 uppercase tracking-widest">
                Co-Counsel Session
              </span>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-tighter">
                Model: <span className="text-orange-400">{ENGINES[activeEngine].model}</span> | Active Role: <span className="text-orange-400">{CHATBOT_ROLES[activeRole].title}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
            {activeEngine === 'LOW_LATENCY' && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-orange-400 uppercase tracking-wider bg-orange-950/10 px-2 py-0.5 border border-orange-900/30 rounded-sm">
                <Zap className="w-3 h-3 fill-orange-400/20" /> Low-Latency Stream
              </span>
            )}
            {activeEngine === 'SEARCH_GROUNDED' && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider bg-cyan-950/10 px-2 py-0.5 border border-cyan-900/30 rounded-sm">
                <Search className="w-3 h-3" /> Search Grounding Enabled
              </span>
            )}
            {activeEngine === 'HIGH_THINKING' && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-purple-400 uppercase tracking-wider bg-purple-950/10 px-2 py-0.5 border border-purple-900/30 rounded-sm">
                <Brain className="w-3 h-3" /> High Thinking Mode
              </span>
            )}
          </div>
        </div>

        {/* Message Thread Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex gap-4 max-w-3xl",
                    isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  {/* Icon Avatar */}
                  <div className={cn(
                    "w-8 h-8 rounded-sm flex items-center justify-center shrink-0 border",
                    isUser 
                      ? "bg-zinc-900 border-zinc-800 text-zinc-300" 
                      : "bg-orange-600/10 border-orange-500/20 text-orange-400"
                  )}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div className="space-y-1">
                    <div className={cn(
                      "p-4 rounded-sm text-sm leading-relaxed",
                      isUser 
                        ? "bg-zinc-900 text-zinc-200 border border-zinc-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.01)]" 
                        : "bg-zinc-950 text-zinc-300"
                    )}>
                      {isUser ? (
                        <p className="whitespace-pre-wrap font-mono text-[11px] font-bold tracking-tight text-zinc-200">
                          {msg.text}
                        </p>
                      ) : (
                        <div className="prose prose-invert prose-zinc max-w-none text-[12px] font-sans text-zinc-300">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                    <div className={cn(
                      "text-[9px] font-mono text-zinc-650 px-1",
                      isUser ? "text-right" : "text-left"
                    )}>
                      {msg.timestamp}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Inline Analysing / High Thinking indicator */}
          {isSending && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 max-w-2xl mr-auto"
            >
              <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0 bg-orange-600/10 border border-orange-500/20 text-orange-400">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>

              <div className="space-y-3 flex-1">
                {activeEngine === 'HIGH_THINKING' ? (
                  <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-sm space-y-4 shadow-xl max-w-md">
                    <div className="flex items-center gap-2.5">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                      >
                        <Activity className="w-4 h-4 text-purple-450 text-purple-450" />
                      </motion.div>
                      <span className="text-[10px] font-mono text-purple-300 uppercase tracking-widest font-bold">
                        Thinking Mode Engaged (Constraint-High)
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[8px] font-mono text-zinc-500 uppercase">
                        <span>Logic Curvature</span>
                        <span className="text-purple-400">{(curvature * 10).toFixed(2)}κ</span>
                      </div>
                      <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-850">
                        <motion.div
                          className="h-full bg-purple-500"
                          initial={{ width: "20%" }}
                          animate={{ width: `${curvature * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-850 text-[9px] font-mono text-zinc-500">
                      <div>
                        <span className="uppercase block text-[8px] text-zinc-600 font-bold">HLE Complexity</span>
                        <span className="text-zinc-300">{hleScore.toFixed(1)}% (Pass 2)</span>
                      </div>
                      <div>
                        <span className="uppercase block text-[8px] text-zinc-600 font-bold">Entropy Reduction</span>
                        <span className="text-zinc-300">{entropy.toFixed(3)} (Low Noise)</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 italic">
                    <span>Co-Counsel is analyzing legal precedents...</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {error && (
            <div className="p-4 bg-red-950/20 border border-red-900/30 text-red-400 rounded-sm text-xs flex gap-3 max-w-3xl font-mono">
              <Info className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-red-300 block uppercase text-[10px] tracking-wider">Engine Processing Alert</span>
                <p className="text-[11px] leading-relaxed text-red-200">{error}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Form footer */}
        <form onSubmit={handleSend} className="p-4 border-t border-zinc-900 bg-zinc-950">
          <div className="relative flex items-center">
            <label htmlFor="chat-message-input" className="sr-only">Type a chat message...</label>
            <input
              id="chat-message-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask as your ${CHATBOT_ROLES[activeRole].title}... (Shift+Inject Case Facts for deep analysis)`}
              disabled={isSending}
              className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-orange-500 rounded-sm py-3 px-4 pr-14 text-xs font-mono text-zinc-100 placeholder-zinc-650 focus:outline-none transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className={cn(
                "absolute right-2 p-1.5 rounded-sm transition-all focus:outline-none cursor-pointer",
                input.trim() && !isSending
                  ? "bg-orange-600 text-white hover:bg-orange-500 shadow-md"
                  : "text-zinc-700 bg-zinc-850 cursor-not-allowed"
              )}
              title="Send Message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-2.5 flex justify-between items-center text-[9px] font-mono text-zinc-600">
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3" />
              Tip: Click "Inject Case Context" to analyze active claims and exhibit manifolds in this tab.
            </span>
            <span>Press Enter to Submit</span>
          </div>
        </form>
      </div>
    </div>
  );
}
