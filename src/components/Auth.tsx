import React, { useState, useEffect } from 'react';
import { googleSignIn } from '../lib/authHelper';
import { 
  Scale, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  ExternalLink, 
  Globe, 
  Key, 
  Palette, 
  Sparkles, 
  Gavel, 
  Terminal,
  Activity,
  ArrowRight,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthProps {
  onEnterSandbox: () => void;
}

type StyleMode = 'executive' | 'courthouse' | 'cybernetic';

const LEGAL_QUOTES = [
  { text: "The safety of the people shall be the highest law.", author: "Cicero, De Legibus" },
  { text: "Where law ends, tyranny begins.", author: "John Locke, Second Treatise" },
  { text: "If we desire respect for the law, we must first make the law respectable.", author: "Louis D. Brandeis" },
  { text: "Justice delayed is justice denied.", author: "William E. Gladstone" },
  { text: "Justice is sweet and musical; but law is bitter and sounding.", author: "Henry David Thoreau" }
];

export function Auth({ onEnterSandbox }: AuthProps) {
  const [styleMode, setStyleMode] = useState<StyleMode>('courthouse');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Rotate quotes safely every 5 seconds without triggering infinite renders
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % LEGAL_QUOTES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);

    try {
      await googleSignIn();
    } catch (err: any) {
      if (
        err.code !== 'auth/popup-closed-by-user' &&
        err.code !== 'auth/cancelled-popup-request' &&
        err.code !== 'auth/popup-blocked'
      ) {
        console.error(err);
      }
      const msg = err.message || '';
      if (msg.includes('popup-closed-by-user')) {
        setError('The Google Sign-In popup was closed before completion. If you clicked away or closed it, please try again, or enter Sandbox Mode to run fully locally.');
      } else if (msg.includes('popup-blocked')) {
        setError('The Google authorization popup was blocked by your browser. Please enable popups or use the Standalone App link below.');
      } else if (msg.includes('internal-error') || msg.toLowerCase().includes('firebase') || err.code?.includes('internal-error')) {
        setError('Firebase Auth internal-error detected (network/cross-origin framing blockage). Chrome often blocks authentication popups inside iframe portals. Use the Standalone App button below, or enter Sandbox Mode to instantly bypass authentication and run fully offline.');
      } else {
        setError(msg || 'An error occurred during authentication.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuote = LEGAL_QUOTES[quoteIndex];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans text-zinc-100 relative overflow-hidden" id="auth-page-container">
      {/* Dynamic background lights that shift depending on chosen style layout */}
      <AnimatePresence mode="wait">
        {styleMode === 'executive' && (
          <motion.div
            key="bg-exec"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 pointer-events-none select-none z-0"
          >
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-zinc-900/50 rounded-full blur-[110px]" />
          </motion.div>
        )}
        {styleMode === 'courthouse' && (
          <motion.div
            key="bg-court"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 pointer-events-none select-none z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/10 via-zinc-950 to-zinc-950"
          >
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-600/5 rounded-full blur-[140px]" />
          </motion.div>
        )}
        {styleMode === 'cybernetic' && (
          <motion.div
            key="bg-cyber"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 pointer-events-none select-none z-0 opacity-40"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(245, 158, 11, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(39, 39, 42, 0.4) 0%, transparent 50%)'
            }}
          >
            {/* Cyber retro aesthetic grids */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Style Selection Pill Control */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mb-8 bg-zinc-900/90 backdrop-blur border border-zinc-800 p-1 rounded-full flex items-center gap-1 z-20 shadow-lg"
        id="login-style-selector"
      >
        <span className="text-[10px] uppercase font-mono text-zinc-500 px-3 flex items-center gap-1.5 font-bold">
          <Palette className="w-3.5 h-3.5 text-amber-500" />
          Style Preset:
        </span>
        <button
          onClick={() => setStyleMode('executive')}
          className={`px-3 py-1 text-[10px] font-mono rounded-full font-semibold uppercase tracking-wider transition-all duration-200 ${
            styleMode === 'executive' 
              ? 'bg-zinc-100 text-zinc-950 font-bold shadow' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          id="btn-style-exec"
        >
          Executive
        </button>
        <button
          onClick={() => setStyleMode('courthouse')}
          className={`px-3 py-1 text-[10px] font-mono rounded-full font-semibold uppercase tracking-wider transition-all duration-200 ${
            styleMode === 'courthouse' 
              ? 'bg-amber-500 text-zinc-950 font-bold shadow' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          id="btn-style-court"
        >
          Courthouse
        </button>
        <button
          onClick={() => setStyleMode('cybernetic')}
          className={`px-3 py-1 text-[10px] font-mono rounded-full font-semibold uppercase tracking-wider transition-all duration-200 ${
            styleMode === 'cybernetic' 
              ? 'bg-amber-600/25 border border-amber-500/40 text-amber-400 font-bold shadow-[0_0_12px_rgba(245,158,11,0.15)]' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          id="btn-style-cyber"
        >
          Cyber Counsel
        </button>
      </motion.div>

      {/* Main Container Layout */}
      <div className="w-full max-w-5xl z-10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          
          {/* ==================== 1. EXECUTIVE MINIMAL STYLE ==================== */}
          {styleMode === 'executive' && (
            <motion.div
              key="auth-exec-layout"
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -15 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md bg-zinc-900/85 backdrop-blur-2xl border border-zinc-850 rounded-lg shadow-[0_32px_64px_-16px_rgba(0,0,0,0.85)] overflow-hidden relative"
              id="executive-card"
            >
              {/* Gold light accent strip */}
              <div className="h-[2px] bg-amber-500" />
              
              <div className="p-8 pb-4 text-center border-b border-zinc-850/50 bg-zinc-950/20">
                <div className="w-12 h-12 mx-auto bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center mb-4 text-amber-500 shadow-md">
                  <Scale className="w-5.5 h-5.5" />
                </div>
                <h2 className="text-xl font-serif font-semibold tracking-tight text-zinc-100">
                  Legal Manifold
                </h2>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.25em] mt-1">
                  Private Practice Workspace
                </p>
              </div>

              <div className="p-8 space-y-6">
                {/* Error Block */}
                {error && <ErrorBlock error={error} onEnterSandbox={onEnterSandbox} />}

                {/* Main Auth Actions */}
                <div className="space-y-4">
                  <GoogleLoginBtn isLoading={isLoading} onClick={handleGoogleSignIn} />
                  
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-zinc-850" />
                    <span className="flex-shrink mx-4 text-[9px] font-mono text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2">
                      Local Bypass
                    </span>
                    <div className="flex-grow border-t border-zinc-850" />
                  </div>

                  <SandboxBtn isLoading={isLoading} onClick={onEnterSandbox} />
                </div>

                {/* Footer details */}
                <div className="pt-4 border-t border-zinc-850/40 flex justify-between items-center text-[9px] font-mono text-zinc-650">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Credentials secured by Google Auth
                  </span>
                  <span>TLS 1.3</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== 2. GRAND COURTHOUSE (SPLIT CINEMATIC) STYLE ==================== */}
          {styleMode === 'courthouse' && (
            <motion.div
              key="auth-court-layout"
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -15 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-4xl bg-zinc-900/90 backdrop-blur-2xl border border-zinc-800 rounded-xl shadow-[0_35px_80px_-15px_rgba(0,0,0,0.9)] overflow-hidden grid grid-cols-1 md:grid-cols-12 relative"
              id="courthouse-portal"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600" />
              
              {/* Left Cinematic Column */}
              <div className="md:col-span-5 bg-gradient-to-b from-zinc-950/95 via-zinc-950/80 to-zinc-900/95 border-r border-zinc-900/80 p-8 flex flex-col justify-between min-h-[380px] relative overflow-hidden">
                {/* Background column mesh graphic */}
                <div className="absolute inset-x-0 bottom-0 top-1/4 bg-[radial-gradient(circle_at_bottom,rgba(245,158,11,0.04),transparent_70%)] pointer-events-none" />
                
                {/* Top Branding Header */}
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-amber-500/10 border border-amber-500/30 rounded flex items-center justify-center text-amber-500">
                      <Gavel className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-mono text-amber-500 font-bold uppercase tracking-widest">
                      Judicial Portal
                    </span>
                  </div>
                  <h1 className="text-3xl font-serif font-bold text-zinc-100 tracking-tight leading-none mt-2">
                    Legal <span className="italic font-normal font-serif text-amber-500">Manifold</span>
                  </h1>
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed pt-1 max-w-[280px]">
                    Empowering jurists with advanced multi-tier precedent matching and automated procedural postures.
                  </p>
                </div>

                {/* Rotating Court Quotes System */}
                <div className="my-8 relative z-10" id="case-law-quotes-carousel">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={quoteIndex}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.35 }}
                      className="space-y-2 border-l-2 border-amber-500/40 pl-4 py-1"
                    >
                      <p className="text-xs text-zinc-300 italic font-serif leading-relaxed">
                        "{currentQuote.text}"
                      </p>
                      <p className="text-[9px] font-mono text-amber-500 uppercase tracking-widest">
                        — {currentQuote.author}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Bottom Stats Monitor */}
                <div className="space-y-2 pt-4 border-t border-zinc-900/80 relative z-10 font-mono text-[9px] text-zinc-500">
                  <div className="flex items-center justify-between">
                    <span>SECURITY LAYER:</span>
                    <span className="text-emerald-500 flex items-center gap-1 font-semibold">
                      <Shield className="w-3 h-3 text-emerald-500 inline" /> TLS 1.3 SIGNED
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>REGULATORY VERSION:</span>
                    <span>ORCP-2026.1 Compliance</span>
                  </div>
                </div>
              </div>

              {/* Right Login/Form Column */}
              <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center space-y-6 bg-zinc-900/60 backdrop-blur-md">
                <div className="space-y-1">
                  <h2 className="text-lg font-serif font-semibold text-zinc-100 flex items-center gap-2">
                    Establish Workbench Session <Sparkles className="w-4 h-4 text-amber-500" />
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Authenticate to synchronize legal matrices via cloud-hosted Firestore or evaluate files securely.
                  </p>
                </div>

                {/* Error Block */}
                {error && <ErrorBlock error={error} onEnterSandbox={onEnterSandbox} />}

                {/* Main Action Block */}
                <div className="space-y-4">
                  <GoogleLoginBtn isLoading={isLoading} onClick={handleGoogleSignIn} />

                  <div className="relative flex py-2 items-center justify-center">
                    <div className="flex-grow border-t border-zinc-800" />
                    <span className="flex-shrink mx-4 text-[9px] font-mono text-zinc-600 bg-zinc-950 border border-zinc-800 px-3 py-0.5 rounded-full uppercase tracking-wider">
                      Or Local Offline Access
                    </span>
                    <div className="flex-grow border-t border-zinc-800" />
                  </div>

                  <SandboxBtn isLoading={isLoading} onClick={onEnterSandbox} />
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded text-[10px] text-zinc-500 leading-relaxed font-sans flex gap-2.5 items-start">
                  <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    Your privacy is protected. Session tokens remain bound to standard sandbox constraints. Google Drive and Google Keep permissions can be toggled inside your active account parameters.
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== 3. CYBERNETIC COUNSEL (RETRO MONO TECH) STYLE ==================== */}
          {styleMode === 'cybernetic' && (
            <motion.div
              key="auth-cyber-layout"
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -15 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md bg-zinc-950 border border-amber-600/30 rounded shadow-[0_0_50px_rgba(217,119,6,0.15)] overflow-hidden font-mono text-xs text-amber-500 relative"
              id="cybernetic-panel"
            >
              {/* Scanline overlay */}
              <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.07] z-30" />
              
              {/* Cyber panel header */}
              <div className="bg-amber-950/20 border-b border-amber-600/30 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span className="font-bold tracking-widest text-amber-400">SESSION_INITIALIZE_v3.1</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-[9px] text-amber-600 uppercase font-bold">STATE: RDY</span>
                </div>
              </div>

              {/* Main digital cockpit */}
              <div className="p-6 space-y-6">
                {/* Active telemetry feed */}
                <div className="p-3 bg-black/60 border border-amber-600/15 rounded text-[10px] space-y-1.5 text-amber-600/90 leading-tight">
                  <div className="flex justify-between">
                    <span>RESOLVING HOST:</span>
                    <span>legal.manifold.intranet</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SECURITY CODES:</span>
                    <span>OAUTH2-HS256 [VERIFIED]</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DATABASE DRIVER:</span>
                    <span>FIRESTORE_NATIVE_DB</span>
                  </div>
                </div>

                {/* Error Block if present */}
                {error && (
                  <div className="p-3 bg-red-950/30 border border-red-500/50 text-red-400 rounded space-y-2">
                    <p className="font-bold flex items-center gap-1.5 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5" /> ERROR_OAUTH_FAILED
                    </p>
                    <p className="text-[10px] leading-relaxed select-text">{error}</p>
                    
                    <div className="pt-2 border-t border-red-500/20 flex gap-2">
                      <button
                        onClick={() => window.open(window.location.href, '_blank')}
                        className="flex-1 text-center py-1.5 bg-red-900/30 hover:bg-red-900/50 border border-red-500/40 text-red-300 rounded text-[9px] transition-all font-bold uppercase cursor-pointer"
                      >
                        Launch Standalone App
                      </button>
                      <button
                        onClick={onEnterSandbox}
                        className="flex-1 text-center py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 rounded text-[9px] transition-all uppercase cursor-pointer"
                      >
                        Local bypass
                      </button>
                    </div>
                  </div>
                )}

                {/* Styled authentic Google Login Button for terminal style */}
                <div className="space-y-3">
                  <label className="text-[10px] text-amber-600/85 block uppercase tracking-widest font-semibold">
                    [SECURE SYSTEM ENTRY METHOD]
                  </label>
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold text-[11px] py-3.5 px-4 rounded transition-all flex items-center justify-center gap-2 cursor-pointer font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(245,158,11,0.25)] border-0"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>$ EXECUTE_GOOGLE_AUTHENTICATION_FLOW</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      </>
                    )}
                  </button>

                  <div className="relative py-2 text-center text-[9px] text-amber-700">
                    --- OR START LOCAL CLIENT TERMINAL ---
                  </div>

                  <button
                    onClick={onEnterSandbox}
                    disabled={isLoading}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-amber-500/80 hover:text-amber-400 border border-amber-600/25 font-bold text-[10px] py-3 rounded transition-all uppercase flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 shrink-0" />
                    <span>START_LOCAL_SANDBOX_STATION_MODE</span>
                  </button>
                </div>

                {/* Bottom visual soundwave/active indicator */}
                <div className="pt-2 border-t border-amber-600/20 flex justify-between items-center text-[9px] text-amber-700">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-amber-600" /> SECURE_SSL: TRUE
                  </span>
                  <span>v3.5.0-FW</span>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Embedded CSS for custom styling (scanlines, vintage effects) matching guidelines */}
      <style>{`
        .bg-scanlines {
          background: linear-gradient(
            rgba(18, 16, 16, 0) 50%,
            rgba(0, 0, 0, 0.25) 50%
          );
          background-size: 100% 4px;
        }
      `}</style>
    </div>
  );
}

/* Helper subcomponents to keep files modular, clean, and safe from token capacity limits */

interface ErrorBlockProps {
  error: string;
  onEnterSandbox: () => void;
}

function ErrorBlock({ error, onEnterSandbox }: ErrorBlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="p-4 bg-red-950/20 border border-red-900/40 rounded flex items-start gap-3 text-red-300">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
        <div className="space-y-1 text-left">
          <p className="text-[10px] font-mono uppercase tracking-widest font-bold text-red-400">Authentication Failed</p>
          <p className="text-xs leading-relaxed text-red-200/95">{error}</p>
        </div>
      </div>
      
      {/* Dynamic Embedded Diagnostic Iframe Helper */}
      <div className="p-4 bg-zinc-950 border border-zinc-850 rounded text-left space-y-3">
        <header className="font-mono text-[9px] text-zinc-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Iframe Diagnostic Helper
        </header>
        <p className="text-[11px] leading-relaxed text-zinc-500 font-sans">
          Browsers operating within embedded sandboxed environments often prevent standard Google Sign-In cookies. Click "Launch Standalone App" to gain safe authentic native authorization access.
        </p>
        
        <div className="pt-2 border-t border-zinc-850 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => window.open(window.location.href, '_blank')}
            className="flex-1 text-center py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-mono text-[10px] tracking-widest uppercase rounded transition-all font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-950/20"
          >
            <ExternalLink className="w-3 h-3" />
            Standalone App
          </button>
          <button
            onClick={onEnterSandbox}
            className="flex-1 text-center py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 font-mono text-[10px] tracking-widest uppercase rounded transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Globe className="w-3 h-3 text-zinc-500" />
            Bypass to Local
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface GoogleLoginBtnProps {
  isLoading: boolean;
  onClick: () => void;
}

function GoogleLoginBtn({ isLoading, onClick }: GoogleLoginBtnProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={isLoading}
      whileHover={{ scale: 1.01, backgroundColor: '#f4f4f5' }}
      whileTap={{ scale: 0.99 }}
      className="w-full bg-white hover:bg-zinc-100 text-zinc-900 font-semibold text-xs py-3.5 px-4 rounded transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-zinc-950/25 uppercase tracking-wider font-mono border border-zinc-200"
    >
      {isLoading ? (
        <Loader2 className="w-4.5 h-4.5 animate-spin text-zinc-700" />
      ) : (
        <>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
            <path d="M1 1h22v22H1z" fill="none" />
          </svg>
          <span>Sign in with Google Account</span>
        </>
      )}
    </motion.button>
  );
}

interface SandboxBtnProps {
  isLoading: boolean;
  onClick: () => void;
}

function SandboxBtn({ isLoading, onClick }: SandboxBtnProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={isLoading}
      whileHover={{ scale: 1.01, borderColor: '#52525b' }}
      whileTap={{ scale: 0.99 }}
      className="w-full bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800 font-mono text-[10px] py-3.5 rounded uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
    >
      <Key className="w-3.5 h-3.5 text-zinc-550 shrink-0" />
      <span>Enter Sandbox Mode (Local Client)</span>
    </motion.button>
  );
}
