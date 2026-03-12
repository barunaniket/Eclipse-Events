// app/admin/dashboard/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
// Added Clock to the imports here!
import { ShieldAlert, Loader2, LogOut, CheckCircle2, XCircle, Eye, Users, FileText, Search, CreditCard, ShieldCheck, X, Clock } from "lucide-react";

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

      setIsAuthorized(true);
      fetchTeams();
    };

    verifyAccess();
  }, []);

  const fetchTeams = async () => {
    setIsLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id, 
          team_name,
          team_number,
          team_size,
          payment_status,
          receipt_url,
          tracks (title),
          candidates (id, full_name, email, srn, is_leader)
        `)
        // Swapped created_at for team_number to prevent schema errors
        .order('team_number', { ascending: false });

      if (error) throw error;
      setTeams(data || []);
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
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve team");

      alert(`Success! Team approved and credentials emailed to ${data.emailsSent} members.`);
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
      const res = await fetch('/api/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/'; 
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
        <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors p-2 bg-white/5 rounded-lg border border-white/5 font-bold text-sm">
          <LogOut size={16} /> Logout
        </button>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        
        <div className="flex flex-col md:flex-row gap-6 mb-8 items-end">
          <div className="flex bg-white/5 p-1.5 rounded-xl border border-white/10 w-full md:w-auto">
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

          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search teams by name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#121212] border-b border-white/10 text-xs uppercase tracking-widest text-gray-400">
                  <th className="p-4 font-bold">Team Name</th>
                  <th className="p-4 font-bold">Track</th>
                  <th className="p-4 font-bold">Leader Details</th>
                  <th className="p-4 font-bold text-center">Receipt</th>
                  <th className="p-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoadingData ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-cyan-500">
                      <Loader2 className="animate-spin mx-auto mb-4" size={32} />
                      <p className="font-mono text-sm uppercase tracking-widest">Loading Records...</p>
                    </td>
                  </tr>
                ) : filteredTeams.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-500 text-sm">
                      No {activeTab} teams found.
                    </td>
                  </tr>
                ) : (
                  filteredTeams.map((team) => {
                    const leader = team.candidates.find((c: any) => c.is_leader) || team.candidates[0];

                    return (
                      <tr key={team.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-white text-base">{team.team_name}</p>
                          <p className="text-xs text-gray-500 font-mono mt-1 flex items-center gap-1">
                            <Users size={12} /> {team.team_size} Members
                          </p>
                        </td>
                        <td className="p-4">
                          <span className="bg-cyan-900/30 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            {team.tracks?.title || "Unknown"}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-gray-200 font-semibold">{leader?.full_name}</p>
                          <p className="text-xs text-gray-500">{leader?.email}</p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">{leader?.srn}</p>
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => setViewingReceipt(team.receipt_url)}
                            className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 p-2 rounded-lg transition-colors inline-block"
                            title="View Receipt"
                          >
                            <Eye size={20} />
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          {activeTab === 'pending' ? (
                            <div className="flex items-center justify-center gap-2">
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
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-1">
                              <CheckCircle2 size={14} className="text-green-500" /> Verified
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
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