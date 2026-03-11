// components/auth/LoginModule.tsx
"use client";

import React, { useState } from "react";
import { Mail, Lock, User, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type LoginType = "candidate" | "volunteer";

export const LoginModule = () => {
  const [loginType, setLoginType] = useState<LoginType>("candidate");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // 1. Authenticate with Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) throw authError;

      // 2. Route them based on the tab they selected
      if (loginType === "candidate") {
        // Security check: Make sure they are actually a candidate
        const teamId = data.user?.user_metadata?.team_id;
        if (!teamId) throw new Error("This account is not registered as a candidate.");
        
        window.location.href = '/candidate/dashboard';
      } else {
        // Route to volunteer dashboard
        window.location.href = '/volunteer/dashboard';
      }

    } catch (err: any) {
      console.error("Login failed:", err.message);
      setError(err.message || "Invalid login credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col">
      {/* Toggle Switch */}
      <div className="flex p-1 bg-white/5 rounded-lg mb-6 border border-white/10">
        <button
          type="button"
          onClick={() => { setLoginType("candidate"); setError(""); }}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2
            ${loginType === "candidate" ? "bg-white/10 text-white shadow-sm" : "text-gray-400 hover:text-white"}`}
        >
          <User size={16} />
          Candidate
        </button>
        <button
          type="button"
          onClick={() => { setLoginType("volunteer"); setError(""); }}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2
            ${loginType === "volunteer" ? "bg-purple-500/20 text-purple-300 shadow-sm" : "text-gray-400 hover:text-white"}`}
        >
          <ShieldCheck size={16} />
          Volunteer
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-4 text-xs flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono tracking-wider"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !email || !password}
          className={`w-full py-3 rounded-lg font-semibold tracking-wide transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
            ${loginType === "candidate" 
              ? "bg-cyan-600 hover:bg-cyan-500 text-white" 
              : "bg-purple-600 hover:bg-purple-500 text-white"}`}
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            loginType === "candidate" ? "LOG IN AS CANDIDATE" : "LOG IN AS VOLUNTEER"
          )}
        </button>
      </form>
    </div>
  );
};