// components/registration/ProblemModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, Loader2, FileWarning } from "lucide-react";

interface ProblemModalProps {
  trackId: string;
  trackTitle: string;
  onClose: () => void;
}

export const ProblemModal = ({ trackId, trackTitle, onClose }: ProblemModalProps) => {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Assuming your markdown files are named exactly like their track ID
    // e.g., if trackId is "ui-ux", it looks for /problems/ui-ux.md
    const fetchMarkdown = async () => {
      try {
        const res = await fetch(`/problems/${trackId}.md`);
        if (!res.ok) throw new Error("Problem statement file not found.");
        const text = await res.text();
        setContent(text);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarkdown();
  }, [trackId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 md:p-6 border-b border-white/10 shrink-0 bg-[#121212]">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide">{trackTitle}</h2>
            <p className="text-xs text-cyan-400 font-mono uppercase tracking-widest mt-1">Full Problem Statement</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-grow bg-black/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 text-cyan-500">
              <Loader2 className="animate-spin mb-4" size={40} />
              <p className="text-sm tracking-widest uppercase font-mono text-gray-400">Loading Document...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-40 text-red-400">
              <FileWarning size={48} className="mb-4 opacity-50" />
              <p>{error}</p>
            </div>
          ) : (
            // The "prose prose-invert" classes are from @tailwindcss/typography
            // It automatically styles standard HTML tags (h1, p, ul, code, etc.) beautifully for dark mode
            <article className="prose prose-invert prose-cyan max-w-none prose-headings:border-b prose-headings:border-white/10 prose-headings:pb-2 prose-a:text-cyan-400 prose-pre:bg-[#121212] prose-pre:border prose-pre:border-white/10">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </article>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 shrink-0 bg-[#121212] flex justify-end">
          <button 
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-lg font-bold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};