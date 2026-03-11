// app/candidate/dashboard/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { LogOut, MapPin, Coffee, Utensils, CheckCircle2, Users, Hash, Loader2, ShieldAlert, User as UserIcon, QrCode, Timer } from "lucide-react";
import { supabase } from "@/lib/supabase";

type QRMode = 'is_present' | 'lunch_received' | 'snacks_received';

export default function CandidateDashboard() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authMessage, setAuthMessage] = useState("Verifying event pass...");

  const [team, setTeam] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false); 
  
  const [qrMode, setQrMode] = useState<QRMode>('is_present');
  const [qrVisible, setQrVisible] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null); 
  const [countdown, setCountdown] = useState(30);

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const fetchTeamData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setAuthMessage("Authentication required. Redirecting to login...");
        setTimeout(() => window.location.href = '/', 2000);
        return;
      }

      const teamId = user.user_metadata?.team_id;
      if (!teamId) {
        setAuthMessage("Access Denied: You are not assigned to a team. Redirecting...");
        setTimeout(() => window.location.href = '/', 2000);
        return;
      }

      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select(`
          id, 
          team_name,
          team_number,
          tracks (title),
          candidates (id, email, full_name, srn, is_leader, is_present, lunch_received, snacks_received)
        `)
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;

      const me = teamData.candidates.find((c: any) => c.email === user.email);
      setCurrentUser(me);

      setTeam({
        id: teamData.id,
        name: teamData.team_name,
        number: teamData.team_number,
        track: teamData.tracks?.title || "Unknown Track",
        members: teamData.candidates.sort((a: any, b: any) => b.is_leader - a.is_leader)
      });
      
      setIsAuthorized(true);

    } catch (err) {
      console.error("Failed to load dashboard:", err);
      setAuthMessage("Error loading pass data. Please try logging in again.");
      setTimeout(() => window.location.href = '/', 2500);
    }
  };

  // REALTIME LISTENER
  useEffect(() => {
    fetchTeamData();
    
    const subscription = supabase
      .channel('public:candidates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'candidates' }, 
        () => { 
          fetchTeamData(); 
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  // INSTANT QR KILL SWITCH
  useEffect(() => {
    if (currentUser && currentUser[qrMode]) {
      setQrVisible(false);
      setQrToken(null);
      setCountdown(0);
    }
  }, [currentUser, qrMode]);

  // 30-SECOND COUNTDOWN LOGIC
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (qrVisible && countdown > 0 && currentUser && !currentUser[qrMode]) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setQrVisible(false);
      setQrToken(null); 
    }
    return () => clearInterval(timer);
  }, [qrVisible, countdown, currentUser, qrMode]);

  const handleGenerateQR = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: team.id })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate security token.");
      }

      setQrToken(data.token);
      setCountdown(30);
      setQrVisible(true);

    } catch (error) {
      console.error("QR Generation Error:", error);
      alert("Failed to generate secure QR pass. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/'; 
  };

  if (!isAuthorized || !team || !currentUser) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-cyan-500">
        {authMessage.includes("Denied") || authMessage.includes("Error") ? (
          <ShieldAlert className="text-red-500 mb-4 animate-in zoom-in" size={48} />
        ) : (
          <Loader2 className="animate-spin mb-4" size={48} />
        )}
        <p className="font-mono tracking-widest text-xs uppercase text-gray-400 text-center max-w-xs">{authMessage}</p>
      </div>
    );
  }

  const isClaimed = currentUser[qrMode];
  
  const modeConfig = {
    is_present: { title: "Venue Check-In", icon: MapPin, color: "cyan", text: "text-cyan-400", border: "border-cyan-500/50", bg: "bg-cyan-500/10" },
    lunch_received: { title: "Lunch Pass", icon: Utensils, color: "green", text: "text-green-400", border: "border-green-500/50", bg: "bg-green-500/10" },
    snacks_received: { title: "Snacks Pass", icon: Coffee, color: "yellow", text: "text-yellow-400", border: "border-yellow-500/50", bg: "bg-yellow-500/10" }
  };

  const activeConfig = modeConfig[qrMode];
  const ActiveIcon = activeConfig.icon;

  const qrPayload = JSON.stringify({
    teamId: team.id,
    userId: currentUser.id,
    token: qrToken,
    mode: qrMode
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30 pb-24">
      <nav className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 px-5 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-1.5 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Users className="text-white" size={16} />
          </div>
          <div>
            <h1 className="font-bold text-white leading-tight text-sm tracking-wide">Participant Hub</h1>
          </div>
        </div>
        <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition-colors p-2 bg-white/5 rounded-full border border-white/5">
          <LogOut size={16} />
        </button>
      </nav>

      <main className="p-5 max-w-md mx-auto flex flex-col items-center animate-in fade-in duration-500">
        
        <div className="w-full bg-gradient-to-b from-[#121212] to-[#0a0a0a] border border-white/10 rounded-3xl p-6 mb-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/10 blur-[40px] rounded-full"></div>
          
          <div className="flex items-center gap-4 mb-5 border-b border-white/5 pb-5">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-800 to-black border-2 border-cyan-500/30 flex items-center justify-center text-lg font-black text-cyan-400 shadow-inner">
              {getInitials(currentUser.full_name)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">{currentUser.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                  <Hash size={12} /> {currentUser.srn}
                </span>
                {currentUser.is_leader && (
                  <span className="bg-cyan-500/20 text-cyan-300 text-[9px] px-2 py-0.5 rounded uppercase tracking-widest font-bold border border-cyan-500/30">
                    Leader
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-black/50 rounded-xl p-4 border border-white/5">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Official Team</span>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-900/30 px-2 py-0.5 rounded border border-cyan-500/20">
                #{team.number.toString().padStart(3, '0')}
              </span>
            </div>
            <p className="font-bold text-white text-lg mb-1">{team.name}</p>
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <ShieldAlert size={12} className="text-cyan-500" /> {team.track}
            </p>
          </div>
        </div>

        <div className="w-full mb-8">
          <h3 className="font-bold text-gray-400 mb-4 uppercase tracking-widest text-xs px-2">Select Digital Pass</h3>
          
          <div className="flex bg-[#121212] p-1.5 rounded-2xl border border-white/10 mb-6">
            <button 
              onClick={() => { setQrMode('is_present'); setQrVisible(false); setQrToken(null); }}
              className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all flex flex-col items-center gap-1.5 ${qrMode === 'is_present' ? 'bg-[#1f1f1f] text-cyan-400 shadow-md border border-white/5' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <MapPin size={18} /> Check-In
            </button>
            <button 
              onClick={() => { setQrMode('lunch_received'); setQrVisible(false); setQrToken(null); }}
              className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all flex flex-col items-center gap-1.5 ${qrMode === 'lunch_received' ? 'bg-[#1f1f1f] text-green-400 shadow-md border border-white/5' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Utensils size={18} /> Lunch
            </button>
            <button 
              onClick={() => { setQrMode('snacks_received'); setQrVisible(false); setQrToken(null); }}
              className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all flex flex-col items-center gap-1.5 ${qrMode === 'snacks_received' ? 'bg-[#1f1f1f] text-yellow-400 shadow-md border border-white/5' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Coffee size={18} /> Snacks
            </button>
          </div>

          <div className={`w-full bg-black border-2 rounded-[2rem] p-8 flex flex-col items-center relative transition-colors duration-500 overflow-hidden ${activeConfig.border} ${activeConfig.bg}`}>
            
            <div className={`flex items-center gap-2 mb-6 ${activeConfig.text}`}>
              <ActiveIcon size={20} />
              <h3 className="font-black text-xl tracking-wide uppercase">{activeConfig.title}</h3>
            </div>

            <div className="relative group bg-white p-5 rounded-3xl shadow-xl min-h-[220px] min-w-[220px] flex items-center justify-center">
              
              <div className="transition-all duration-500 flex flex-col items-center">
                {isClaimed ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center animate-in zoom-in duration-300 bg-white rounded-3xl z-10">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center border-4 border-green-500 shadow-xl mb-3">
                      <CheckCircle2 className="text-green-500" size={40} />
                    </div>
                    <span className="text-green-600 font-black text-lg uppercase tracking-widest">
                      Verified
                    </span>
                    <span className="text-gray-500 text-xs font-mono mt-2">Good to go!</span>
                  </div>
                ) : (qrVisible && qrToken) ? (
                  <div className="flex flex-col items-center animate-in zoom-in duration-300">
                    <div className="bg-white p-2 rounded-xl">
                      <QRCode 
                        value={qrPayload}
                        size={180}
                        level="H"
                      />
                    </div>
                    
                    <div className={`mt-4 bg-black/95 backdrop-blur-md px-5 py-2.5 rounded-full flex items-center gap-2 text-xs font-bold font-mono whitespace-nowrap shadow-xl border border-white/10 transition-colors ${countdown <= 10 ? 'text-red-400 border-red-500/50 scale-105' : 'text-white'}`}>
                      <Timer size={14} className={countdown <= 10 ? 'animate-pulse' : ''} />
                      00:{countdown.toString().padStart(2, '0')}
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={handleGenerateQR}
                    disabled={isGenerating}
                    className={`flex flex-col items-center justify-center gap-3 w-[180px] h-[180px] rounded-2xl border-2 border-dashed bg-gray-50 transition-all hover:bg-gray-100 active:scale-95 animate-in zoom-in duration-300 disabled:opacity-50 disabled:scale-100 ${activeConfig.border} ${activeConfig.text}`}
                  >
                    {isGenerating ? (
                      <Loader2 size={48} className="animate-spin opacity-60 mb-1" />
                    ) : (
                      <QrCode size={48} className="opacity-60 mb-1" />
                    )}
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-black uppercase tracking-widest text-sm text-black">
                        {isGenerating ? "Generating..." : "Tap to Reveal"}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono font-bold">VALID FOR 30 SEC</span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            <p className="text-gray-400 font-mono uppercase tracking-widest text-[10px] mt-8 text-center px-4">
              {isClaimed ? "You have already completed this step." : (qrVisible ? "Present this code to the event staff quickly." : "Do not generate until you reach the desk.")}
            </p>
          </div>
        </div>

        <div className="w-full bg-[#121212] border border-white/5 rounded-3xl p-5 shadow-lg">
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="font-bold text-gray-300 uppercase tracking-wider text-xs">Team Status</h3>
            <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-black border border-white/10 ${activeConfig.text}`}>
              {activeConfig.title}
            </span>
          </div>

          <div className="divide-y divide-white/5">
            {team.members.map((member: any) => {
              const memberClaimed = member[qrMode];
              const isMe = member.id === currentUser.id;

              return (
                <div key={member.id} className="flex justify-between items-center py-3 first:pt-1 last:pb-1">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${memberClaimed ? `${activeConfig.bg} ${activeConfig.border} ${activeConfig.text}` : 'bg-black border-gray-800 text-gray-600'}`}>
                      {memberClaimed ? <CheckCircle2 size={14} /> : <UserIcon size={14} />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-200 flex items-center gap-2">
                        {member.full_name} {isMe && <span className="text-gray-500 text-xs font-normal">(You)</span>}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                        {memberClaimed ? "Verified" : "Pending"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}