import React from 'react';
import { motion } from 'motion/react';
import { Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface ThinkingIndicatorProps {
  isThinking: boolean;
  curvature: number; // 0 to 1
  sweBench?: number; // 0 to 100
  hleScore?: number; // 0 to 100
  entropyScore?: number; // 0 to 1
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ 
  isThinking, 
  curvature,
  sweBench = 0,
  hleScore = 0,
  entropyScore = 1
}) => {
  if (!isThinking) return null;

  const isStable = curvature > 0.9 && sweBench > 80 && hleScore > 45 && entropyScore < 0.2;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl space-y-6">
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Activity className="w-6 h-6 text-orange-500" />
        </motion.div>
        <span className="text-sm font-mono text-zinc-100 uppercase tracking-widest">
          Manifold-Constrained Reasoning Active
        </span>
      </div>
      
      <div className="w-full max-w-md space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">
            <span>Logic Curvature</span>
            <span>{(curvature * 10).toFixed(2)}κ</span>
          </div>
          <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-orange-500"
              initial={{ width: "0%" }}
              animate={{ width: `${curvature * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="text-[9px] font-mono text-zinc-600 uppercase">SWE-Bench</div>
            <div className={cn(
              "text-xs font-mono",
              sweBench > 80 ? "text-green-500" : "text-zinc-500"
            )}>
              {sweBench.toFixed(1)}%
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[9px] font-mono text-zinc-600 uppercase">HLE Score</div>
            <div className={cn(
              "text-xs font-mono",
              hleScore > 45 ? "text-green-500" : "text-zinc-500"
            )}>
              {hleScore.toFixed(1)}%
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[9px] font-mono text-zinc-600 uppercase">Entropy</div>
            <div className={cn(
              "text-xs font-mono",
              entropyScore < 0.2 ? "text-green-500" : "text-red-500"
            )}>
              {entropyScore.toFixed(3)}
            </div>
          </div>
        </div>
      </div>
      
      <div className={cn(
        "px-4 py-2 border font-mono text-[10px] uppercase tracking-[0.2em] transition-all",
        isStable 
          ? "bg-green-900/20 border-green-500 text-green-400" 
          : "bg-zinc-800/50 border-zinc-700 text-zinc-500"
      )}>
        Ready Flag: {isStable ? "STABLE & VERIFIED" : "STABILIZING MANIFOLD..."}
      </div>
    </div>
  );
};
