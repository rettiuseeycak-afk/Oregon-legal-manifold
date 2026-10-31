import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

interface OregonPleadingPaperProps {
  content: string;
  isPreview?: boolean;
}

export const OregonPleadingPaper: React.FC<OregonPleadingPaperProps> = ({ content, isPreview = false }) => {
  // Generate line numbers 1 to 28
  const lineNumbers = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <div className={cn(
      "relative font-serif text-[12pt] leading-[24pt] box-border",
      isPreview ? "bg-white text-black shadow-2xl mx-auto print:shadow-none print:m-0" : "bg-zinc-900 text-zinc-100 p-8"
    )}
    style={isPreview ? { 
      width: '8.5in', 
      minHeight: '11in', 
      paddingTop: '2in', 
      paddingBottom: '1in', 
      paddingLeft: '1in', 
      paddingRight: '1in' 
    } : {}}
    >
      {/* Line Numbers Column */}
      <div className={cn(
        "absolute flex flex-col items-end select-none border-r pr-2",
        isPreview ? "left-[0.25in] top-[2in] w-[0.5in] border-zinc-300 text-zinc-400" : "left-4 top-8 bottom-8 w-8 border-zinc-800 text-zinc-700"
      )}>
        {lineNumbers.map(n => (
          <div key={n} className="h-[24pt] flex items-center justify-end text-[10pt] font-mono">
            {n}
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div className={cn(
        "relative",
        isPreview ? "ml-[0.2in]" : "ml-12 pl-4"
      )}>
        <div className={cn(
          "prose max-w-none",
          isPreview ? "prose-zinc" : "prose-invert prose-zinc"
        )}
        style={{ lineHeight: '24pt' }}>
          <ReactMarkdown
            components={{
              p: ({node, ...props}) => <p style={{ margin: 0, minHeight: '24pt' }} {...props} />,
              h1: ({node, ...props}) => <h1 style={{ margin: 0, minHeight: '24pt', textAlign: 'center', fontWeight: 'bold', fontSize: '12pt', textTransform: 'uppercase' }} {...props} />,
              h2: ({node, ...props}) => <h2 style={{ margin: 0, minHeight: '24pt', textAlign: 'center', fontWeight: 'bold', fontSize: '12pt' }} {...props} />,
              h3: ({node, ...props}) => <h3 style={{ margin: 0, minHeight: '24pt', fontWeight: 'bold', fontSize: '12pt' }} {...props} />,
              ol: ({node, ...props}) => <ol style={{ margin: 0, paddingLeft: '0.5in', listStyleType: 'decimal' }} {...props} />,
              ul: ({node, ...props}) => <ul style={{ margin: 0, paddingLeft: '0.5in', listStyleType: 'disc' }} {...props} />,
              li: ({node, ...props}) => <li style={{ margin: 0, minHeight: '24pt' }} {...props} />,
              blockquote: ({node, ...props}) => <blockquote style={{ margin: 0, paddingLeft: '0.5in', borderLeft: 'none', fontStyle: 'italic' }} {...props} />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>

      {/* Footer */}
      <div className={cn(
        "absolute bottom-[0.5in] left-[1in] right-[1in] border-t text-[8pt] font-mono uppercase tracking-widest text-center pt-2",
        isPreview ? "border-zinc-300 text-zinc-500" : "border-zinc-800 text-zinc-600"
      )}>
        CONFIDENTIAL WORK PRODUCT: PREPARED BY PRO SE LITIGANT IN ANTICIPATION OF LITIGATION. 
        PRIVILEGE MAINTAINED PURSUANT TO WARNER V. GILBARCO (E.D. MICH. 2026).
      </div>
    </div>
  );
};
