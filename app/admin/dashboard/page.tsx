// app/admin/dashboard/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
// Added Clock to the imports here!
import { ShieldAlert, Loader2, LogOut, CheckCircle2, Eye, Users, FileText, Search, CreditCard, ShieldCheck, X, Clock, Radio, RadioTower, Download, Trash2, FolderX, ChevronDown, ChevronUp } from "lucide-react";

type TeamStatus = 'pending' | 'approved';

export default function AdminDashboard() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authMessage, setAuthMessage] = useState("Authenticating Admin Credentials...");

  const [activeTab, setActiveTab] = useState<TeamStatus>('pending');
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isClearingDb, setIsClearingDb] = useState(false);
  const [isClearingReceipts, setIsClearingReceipts] = useState(false);

  const [eventIsLive, setEventIsLive] = useState<boolean | null>(null);
  const [isTogglingEvent, setIsTogglingEvent] = useState(false);
  const needsCycle = (srn?: string) => (srn || "").trim().toUpperCase().startsWith("PES2UG25");

  useEffect(() => {
    const verifyAccess = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        setAuthMessage("Authentication required. Redirecting to login...");
        setTimeout(() => window.location.href = '/', 2000);
        return;
      }

      const role = user.user_metadata?.role;
      if (role !== "admin") {
        setAuthMessage("CRITICAL ACCESS DENIED: Super Admin privileges required.");
        setTimeout(() => window.location.href = '/', 2000);
        return;
      }

      // Fetch event status
      const { data: settings } = await supabase
        .from('event_settings')
        .select('is_live')
        .eq('id', 1)
        .single();
      setEventIsLive(settings?.is_live ?? false);

      setIsAuthorized(true);
      fetchTeams();
    };

    verifyAccess();
  }, []);

  const fetchTeams = async () => {
    setIsLoadingData(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/teams', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.access_token ?? ''}`
        }
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to fetch teams.");

      setTeams(payload.teams || []);
    } catch (err: any) {
      console.error("Failed to fetch teams:", err.message || err);
      // Removed the alert here so it doesn't spam you during dev
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleApprove = async (teamId: string) => {
    if (!confirm("Are you sure you want to approve this team? This will generate credentials and email them instantly.")) return;

    setProcessingId(teamId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`
        },
        body: JSON.stringify({ teamId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve team");

      if (data.emailsSent === 0 && data.emailsFailed === 0) {
        alert(`WARNING: Team approved but NO credential emails were attempted (0 candidates found or processed). Check server logs.`);
      } else if (data.emailsFailed && data.emailsFailed > 0) {
        const failureList = (data.emailFailures || [])
          .map((f: any) => `${f.email}: ${f.reason}`)
          .join("\n");
        alert(`Team approved, but ${data.emailsFailed} email(s) failed:\n${failureList || 'Unknown email error'}`);
      } else {
        alert(`Success! Team approved and credentials emailed to ${data.emailsSent} member(s).`);
      }
      fetchTeams(); 
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (teamId: string) => {
    const reason = prompt("Enter a reason for rejection (this will be emailed to the leader):", "Invalid payment receipt.");
    if (reason === null) return;

    setProcessingId(teamId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`
        },
        body: JSON.stringify({ teamId, reason })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject team");

      alert("Team rejected, deleted from database, and leader notified.");
      fetchTeams(); 
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleEvent = async () => {
    const action = eventIsLive ? "go OFFLINE" : "go LIVE";
    if (!confirm(`Are you sure you want to set the event to ${action.toUpperCase()}? This will immediately affect all logged-in candidates.`)) return;

    setIsTogglingEvent(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/toggle-event', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle event");
      setEventIsLive(data.is_live);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsTogglingEvent(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleExportVerified = async () => {
    setIsExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/export-verified', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}` }
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to export verified teams.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `verified-teams-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error.message || "Failed to export verified teams.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!confirm("This will permanently clear teams, candidates, and payment receipts. Continue?")) return;
    const typed = prompt('Type CLEAR to confirm database reset:');
    if (typed !== 'CLEAR') return;

    setIsClearingDb(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/clear-db', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to clear database.");
      alert(`Database cleared. Auth users deleted: ${data.authUsersDeleted ?? 0}.`);
      fetchTeams();
    } catch (error: any) {
      alert(error.message || "Failed to clear database.");
    } finally {
      setIsClearingDb(false);
    }
  };

  const handleClearReceipts = async () => {
    if (!confirm("This will permanently delete all files in the receipts bucket. Continue?")) return;
    const typed = prompt('Type CLEAR to confirm storage wipe:');
    if (typed !== 'CLEAR') return;

    setIsClearingReceipts(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/clear-receipts', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to clear receipts bucket.");
      alert(`Receipts bucket cleared. Files deleted: ${data.deleted ?? 0}.`);
    } catch (error: any) {
      alert(error.message || "Failed to clear receipts bucket.");
    } finally {
      setIsClearingReceipts(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-cyan-500">
        {authMessage.includes("DENIED") ? (
          <ShieldAlert className="text-red-500 mb-4 animate-in zoom-in" size={64} />
        ) : (
          <Loader2 className="animate-spin mb-4" size={48} />
        )}
        <p className="font-mono tracking-widest text-xs uppercase text-gray-400 text-center max-w-xs">{authMessage}</p>
      </div>
    );
  }

  const filteredTeams = teams.filter(t => 
    t.payment_status === activeTab &&
    (t.team_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     t.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30">
      
      <nav className="sticky top-0 z-40 bg-[#0a0a0a] border-b border-white/10 px-6 py-4 flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-purple-600 to-cyan-600 p-2 rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.3)]">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <div>
            <h1 className="font-black text-white text-xl tracking-wide uppercase">Super Admin</h1>
            <p className="text-xs text-purple-400 font-mono tracking-widest uppercase">God Mode Control</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleEvent}
            disabled={isTogglingEvent || eventIsLive === null}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50 border ${
              eventIsLive
                ? 'bg-green-500/15 text-green-400 border-green-500/40 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/40'
                : 'bg-gray-500/10 text-gray-400 border-gray-500/30 hover:bg-green-500/15 hover:text-green-400 hover:border-green-500/40'
            }`}
          >
            {isTogglingEvent ? (
              <Loader2 size={16} className="animate-spin" />
            ) : eventIsLive ? (
              <RadioTower size={16} className="animate-pulse" />
            ) : (
              <Radio size={16} />
            )}
            {eventIsLive ? 'Event: LIVE' : 'Event: OFFLINE'}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors p-2 bg-white/5 rounded-lg border border-white/5 font-bold text-sm">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 lg:p-8">
        
        <div className="flex flex-col lg:grid lg:grid-cols-[auto_1fr] gap-6 mb-6 items-end">
          <div className="flex bg-white/5 p-1.5 rounded-xl border border-white/10 w-full lg:w-auto">
            <button 
              onClick={() => setActiveTab('pending')}
              className={`flex-1 md:w-48 py-3 text-sm font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'pending' ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Clock size={16} /> Pending ({teams.filter(t => t.payment_status === 'pending').length})
            </button>
            <button 
              onClick={() => setActiveTab('approved')}
              className={`flex-1 md:w-48 py-3 text-sm font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'approved' ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <CheckCircle2 size={16} /> Approved ({teams.filter(t => t.payment_status === 'approved').length})
            </button>
          </div>

          <div className="relative w-full lg:justify-self-end">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search teams by name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full lg:w-[360px] bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button
            onClick={handleExportVerified}
            disabled={isExporting}
            className="flex items-center gap-2 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Export Verified Teams
          </button>
          <button
            onClick={handleClearDatabase}
            disabled={isClearingDb}
            className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          >
            {isClearingDb ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Clear Database
          </button>
          <button
            onClick={handleClearReceipts}
            disabled={isClearingReceipts}
            className="flex items-center gap-2 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          >
            {isClearingReceipts ? <Loader2 size={16} className="animate-spin" /> : <FolderX size={16} />}
            Clear Receipts Bucket
          </button>
        </div>

        <div className="space-y-4">
          {isLoadingData ? (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-12 text-center text-cyan-500">
              <Loader2 className="animate-spin mx-auto mb-4" size={32} />
              <p className="font-mono text-sm uppercase tracking-widest">Loading Records...</p>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-12 text-center text-gray-500 text-sm">
              No {activeTab} teams found.
            </div>
          ) : (
            filteredTeams.map((team) => {
              const receiptMap = new Map<number, string>();
              (team.payment_receipts ?? []).forEach((r: any) => {
                if (typeof r.member_index === "number") {
                  receiptMap.set(r.member_index, r.receipt_url);
                }
              });

              if (team.receipt_url && !receiptMap.has(1)) {
                receiptMap.set(1, team.receipt_url);
              }

              const candidates = (team.candidates ?? []).slice().sort((a: any, b: any) => {
                const aIndex = a.member_index ?? 0;
                const bIndex = b.member_index ?? 0;
                return aIndex - bIndex;
              });
              const leader = candidates.find((c: any) => c.is_leader) || candidates[0];
              const isExpanded = expandedTeams.has(team.id);

              return (
                <div key={team.id} className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <Users size={20} className="text-cyan-400" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-bold text-white">{team.team_name}</h3>
                          <span className={`text-[10px] uppercase font-mono tracking-widest px-2 py-1 rounded-full border ${team.payment_status === 'approved' ? 'bg-green-600/20 text-green-400 border-green-500/30' : 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30'}`}>
                            {team.payment_status}
                          </span>
                          {team.team_number && (
                            <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-1 rounded-full border border-white/10 text-gray-400 bg-white/5">
                              Team #{team.team_number}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-gray-400 flex flex-wrap gap-4">
                          <span className="flex items-center gap-1"><FileText size={14} className="text-cyan-500" /> {team.tracks?.title || "Unknown Track"}</span>
                          <span className="flex items-center gap-1"><Users size={14} className="text-purple-400" /> {team.team_size} Members</span>
                        </div>
                        {leader && (
                          <div className="mt-3 text-xs text-gray-400">
                            <p className="text-gray-200 font-semibold">{leader.full_name}</p>
                            <p>{leader.email}</p>
                            <p className="font-mono">{leader.srn}</p>
                            {needsCycle(leader?.srn) && leader?.cycle && (
                              <p className="text-[10px] text-cyan-300 font-mono uppercase">Cycle: {leader.cycle}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end">
                      {activeTab === 'pending' ? (
                        <>
                          <button 
                            onClick={() => handleApprove(team.id)}
                            disabled={processingId === team.id}
                            className="bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                          >
                            {processingId === team.id ? <Loader2 size={16} className="animate-spin" /> : "Approve"}
                          </button>
                          <button 
                            onClick={() => handleReject(team.id)}
                            disabled={processingId === team.id}
                            className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-gray-500 text-xs font-mono uppercase tracking-widest flex items-center gap-1">
                          <CheckCircle2 size={14} className="text-green-500" /> Verified
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setExpandedTeams((prev) => {
                            const next = new Set(prev);
                            if (next.has(team.id)) next.delete(team.id);
                            else next.add(team.id);
                            return next;
                          });
                        }}
                        className="bg-white/10 hover:bg-white/20 text-gray-200 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {isExpanded ? "Hide Candidates" : "View Candidates"}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-white/10 px-5 py-4">
                      <div className="grid grid-cols-1 gap-3">
                        {candidates.map((candidate: any) => {
                          const receiptUrl = receiptMap.get(candidate.member_index);
                          return (
                            <div key={candidate.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                              <div className="text-sm text-gray-300">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-white font-semibold">{candidate.full_name}</p>
                                  {candidate.is_leader && (
                                    <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-600/20 text-cyan-300">
                                      Leader
                                    </span>
                                  )}
                                  {candidate.member_index && (
                                    <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-gray-400">
                                      Member {candidate.member_index}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">{candidate.email}</p>
                                {candidate.phone && <p className="text-xs text-gray-500">{candidate.phone}</p>}
                                <p className="text-xs text-gray-500 font-mono">{candidate.srn}</p>
                                {needsCycle(candidate?.srn) && candidate?.cycle && (
                                  <p className="text-[10px] text-cyan-300 font-mono uppercase">Cycle: {candidate.cycle}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {receiptUrl ? (
                                  <button
                                    onClick={() => setViewingReceipt(receiptUrl)}
                                    className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 px-3 py-2 rounded-lg transition-colors inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                                    title={`View Receipt - Member ${candidate.member_index ?? ''}`}
                                  >
                                    <Eye size={16} />
                                    View Receipt
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-500 font-mono uppercase tracking-widest">No Receipt</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {viewingReceipt && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="font-bold text-white flex items-center gap-2"><CreditCard size={18} className="text-cyan-500"/> Payment Receipt</h3>
              <button onClick={() => setViewingReceipt(null)} className="text-gray-400 hover:text-white p-2"><X size={24} /></button>
            </div>
            <div className="flex-grow p-4 overflow-hidden flex items-center justify-center bg-black/50">
               {viewingReceipt.toLowerCase().endsWith('.pdf') ? (
                 <iframe src={viewingReceipt} className="w-full h-full rounded-xl" />
               ) : (
                 <img src={viewingReceipt} alt="Receipt" className="max-w-full max-h-full object-contain rounded-xl" />
               )}
            </div>
            <div className="p-4 border-t border-white/10 flex justify-end">
              <button onClick={() => setViewingReceipt(null)} className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-lg font-bold text-sm transition-colors">Close Viewer</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
