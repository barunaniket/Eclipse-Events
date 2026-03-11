// app/candidate/login/page.tsx
"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, Loader2, AlertTriangle, ArrowRight, Users } from "lucide-react";
import Link from "next/link";

export default function CandidateLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCandidateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(""); // Clear any previous errors
    
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) throw authError;

      // Upon success, push them straight to the candidate dashboard!
      window.location.href = '/candidate/dashboard';

    } catch (err: any) {
      console.error("Login failed:", err.message);
      setError(err.message || "Invalid login credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 selection:bg-cyan-500/30">
      
      {/* Branding Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="bg-cyan-900/30 p-4 rounded-2xl border border-cyan-500/20 mb-4 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
          <Users className="text-cyan-400" size={32} />
        </div>
        <h1 className="text-2xl font-black text-white tracking-wide">PARTICIPANT HUB</h1>
        <p className="text-sm text-cyan-400 font-mono tracking-widest uppercase mt-1">Eclipse Event</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm bg-[#121212] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        
        {/* Subtle Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500/50"></div>

        <p className="text-gray-400 text-sm text-center mb-6">
          Enter the credentials generated during registration to access your digital pass.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-6 text-sm flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleCandidateLogin} className="space-y-4">
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="leader@example.com"
                className="w-full bg-black border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:border-cyan-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Auto-Generated Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Eclipse-XXXXXX!"
                className="w-full bg-black border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:border-cyan-500 focus:outline-none transition-colors font-mono tracking-wider"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !email || !password}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed py-3.5 rounded-xl font-bold uppercase tracking-wider flex justify-center items-center gap-2 transition-all mt-6 shadow-lg text-white"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Access Pass"}
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>

      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="text-gray-500 text-sm hover:text-white transition-colors">
          &larr; Return to Main Site
        </Link>
      </div>

    </div>
  );
}