// app/volunteer/dashboard/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { QrCode, Users, CheckCircle2, Coffee, LogOut, Search, X, ScanLine, AlertTriangle, Loader2, Keyboard, UserCheck, Utensils, Hash } from "lucide-react";
import Link from "next/link";
import { QRScanner } from "@/components/volunteer/QRScanner";
import { supabase } from "@/lib/supabase";

type ScanMode = "is_present" | "lunch_received" | "snacks_received";

export default function VolunteerDashboard() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanState, setScanState] = useState<"idle" | "processing" | "verify_team" | "success" | "error" | "camera_blocked">("idle");
  const [scanMessage, setScanMessage] = useState("");
  const [manualTeamInput, setManualTeamInput] = useState("");
  
  const [activeMode, setActiveMode] = useState<ScanMode>("is_present");

  const [verifyingTeam, setVerifyingTeam] = useState<any>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  const [liveTeams, setLiveTeams] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({ checkedIn: 0, lunches: 0, snacks: 0 });

  const fetchLiveVenueData = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id, 
          team_name,
          team_number,
          team_size,
          tracks (title),
          candidates (id, full_name, srn, is_leader, is_present, lunch_received, snacks_received)
        `)
        .order('team_number', { ascending: false });

      if (error) throw error;

      let totalCheckedIn = 0;
      let totalLunches = 0;
      let totalSnacks = 0;

      const formattedTeams = data.map((team: any) => {
        let presentCount = 0;
        let lunchCount = 0;
        let snackCount = 0;

        team.candidates.forEach((c: any) => {
          if (c.is_present) { presentCount++; totalCheckedIn++; }
          if (c.lunch_received) { lunchCount++; totalLunches++; }
          if (c.snacks_received) { snackCount++; totalSnacks++; }
        });

        return {
          id: team.id,
          name: team.team_name,
          teamNumber: team.team_number,
          track: team.tracks?.title || "Unknown Track",
          size: team.team_size,
          checkedIn: presentCount,
          lunch: lunchCount,
          snacks: snackCount
        };
      });

      setLiveTeams(formattedTeams);
      setStats({ checkedIn: totalCheckedIn, lunches: totalLunches, snacks: totalSnacks });
    } catch (err) {
      console.error("Failed to fetch venue data:", err);
    }
  };

  useEffect(() => {
    fetchLiveVenueData();
    const interval = setInterval(fetchLiveVenueData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleQRScan = async (input: string) => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;
    setScanState("processing");

    try {
      let teamIdToSearch = trimmedInput;
      let providedToken = null;
      let providedUserId = null;
      let providedMode = null;

      // 1. Determine if it's a Manual Entry (number) or a QR Scan (JSON string)
      const isNumeric = /^\d+$/.test(trimmedInput);

      if (!isNumeric) {
        try {
          const payload = JSON.parse(trimmedInput);
          teamIdToSearch = payload.teamId || payload.id; // backward compatibility
          providedToken = payload.token;
          providedUserId = payload.userId; // The specific person showing the phone
          providedMode = payload.mode; // The specific pass they generated
        } catch (e) {
          if (trimmedInput.length > 20) {
            throw new Error("Invalid QR Format. Ask candidate to regenerate.");
          }
        }
      }

      // 2. Query the Database for the Team
      let query = supabase
        .from('teams')
        .select(`
          id,
          team_name,
          team_number,
          qr_token,
          qr_expires_at,
          tracks (title),
          candidates (id, full_name, srn, is_leader, is_present, lunch_received, snacks_received)
        `);

      if (isNumeric) {
        query = query.eq('team_number', parseInt(trimmedInput, 10));
      } else {
        query = query.eq('id', teamIdToSearch);
      }

      const { data: team, error: fetchError } = await query.single();

      if (fetchError || !team) {
        throw new Error("Invalid Code or Team not found.");
      }

      // 3. SECURITY CHECK: Verify Token, Expiry, and Correct Pass Mode
      if (!isNumeric) {
        // Prevent someone from using a Snacks QR code at the Lunch line
        if (providedMode && providedMode !== activeMode) {
          const modeNames: Record<string, string> = {
            is_present: "Check-In",
            lunch_received: "Lunch",
            snacks_received: "Snacks"
          };
          throw new Error(`Pass Mismatch! Candidate presented a ${modeNames[providedMode]} pass, but you are scanning for ${modeNames[activeMode]}.`);
        }

        if (!providedToken || team.qr_token !== providedToken) {
          throw new Error("Invalid Security Token. Nice try.");
        }

        const now = new Date();
        const expiresAt = new Date(team.qr_expires_at);

        if (now > expiresAt) {
          throw new Error("QR Code Expired. Ask candidate to tap 'Reveal' again.");
        }
      }

      // 4. SMART ROUTING: Instant Scan vs Roster Selection
      // If we are doing Check-In OR if it was a manual number entry without a specific userId -> Show Roster
      if (activeMode === "is_present" || isNumeric || !providedUserId) {
        setVerifyingTeam(team);
        setSelectedMembers(new Set());
        setScanState("verify_team");
      } 
      // If we are doing Lunch/Snacks and we have a specific candidate's QR -> INSTANT APPROVAL
      else {
        const candidate = team.candidates.find((c: any) => c.id === providedUserId);
        
        if (!candidate) {
          throw new Error("Candidate not found in this team.");
        }

        if (candidate[activeMode]) {
          throw new Error(`Already Claimed: ${candidate.full_name} has already received this.`);
        }

        // Instantly update database
        const { error: updateError } = await supabase
          .from('candidates')
          .update({ [activeMode]: true })
          .eq('id', providedUserId);

        if (updateError) throw updateError;

        fetchLiveVenueData();
        
        const modeLabels = {
          lunch_received: "Lunch Distributed",
          snacks_received: "Snacks Distributed",
          is_present: "Checked In" // Fallback
        };

        setScanState("success");
        setScanMessage(`Verified: ${candidate.full_name} (${modeLabels[activeMode]})`);
      }

    } catch (err: any) {
      console.error(err);
      setScanState("error");
      setScanMessage(err.message || "Something went wrong.");
    }
  };

  const handleConfirmVerification = async () => {
    if (selectedMembers.size === 0) {
      setScanState("idle");
      return;
    }

    setScanState("processing");

    try {
      const updatePayload = { [activeMode]: true };
      
      const { error: updateError } = await supabase
        .from('candidates')
        .update(updatePayload)
        .in('id', Array.from(selectedMembers));

      if (updateError) throw updateError;

      fetchLiveVenueData();

      const modeLabels = {
        is_present: "Checked In",
        lunch_received: "Lunch Distributed",
        snacks_received: "Snacks Distributed"
      };

      setScanState("success");
      setScanMessage(`Successfully recorded: ${modeLabels[activeMode]} for ${selectedMembers.size} member(s).`);

    } catch (err: any) {
      console.error(err);
      setScanState("error");
      setScanMessage(err.message || "Failed to update records.");
    }
  };

  const toggleMemberSelection = (candidateId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(candidateId)) {
      newSelection.delete(candidateId);
    } else {
      newSelection.add(candidateId);
    }
    setSelectedMembers(newSelection);
  };

  const handleCameraError = (errorMessage: string) => {
    setScanState("camera_blocked");
    if (errorMessage.includes("not supported")) {
      setScanMessage("Camera streaming blocked. Ensure site is on HTTPS.");
    } else {
      setScanMessage("Camera access denied. Check browser permissions.");
    }
  };

  const resetScanner = () => {
    setScanState("idle");
    setScanMessage("");
    setManualTeamInput("");
    setVerifyingTeam(null);
    setIsScanning(false);
  };

  const filteredTeams = liveTeams.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.teamNumber.toString() === searchQuery ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30">
      
      <nav className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-600/20 p-2 rounded-lg border border-cyan-500/30">
            <QrCode className="text-cyan-400" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-white leading-tight">Volunteer Hub</h1>
            <p className="text-xs text-gray-400 font-mono">LIVE VENUE</p>
          </div>
        </div>
        <Link href="/" className="text-gray-400 hover:text-red-400 transition-colors p-2">
          <LogOut size={20} />
        </Link>
      </nav>

      <main className="p-4 pb-32 max-w-3xl mx-auto">
        
        <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex gap-2 mb-6">
          <button 
            onClick={() => setActiveMode("is_present")}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-lg flex flex-col items-center gap-1 transition-all ${activeMode === "is_present" ? "bg-cyan-600 text-white" : "text-gray-400 hover:bg-white/5"}`}
          >
            <UserCheck size={18} /> Check-In
          </button>
          <button 
            onClick={() => setActiveMode("lunch_received")}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-lg flex flex-col items-center gap-1 transition-all ${activeMode === "lunch_received" ? "bg-green-600 text-white" : "text-gray-400 hover:bg-white/5"}`}
          >
            <Utensils size={18} /> Lunch
          </button>
          <button 
            onClick={() => setActiveMode("snacks_received")}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-lg flex flex-col items-center gap-1 transition-all ${activeMode === "snacks_received" ? "bg-yellow-600 text-white" : "text-gray-400 hover:bg-white/5"}`}
          >
            <Coffee size={18} /> Snacks
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-cyan-400">{stats.checkedIn}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Checked In</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-green-400">{stats.lunches}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Lunch Given</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-yellow-400">{stats.snacks}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Snacks Given</span>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search by Team No. or Name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm focus:border-cyan-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="space-y-3">
          {filteredTeams.length === 0 ? (
             <p className="text-center text-gray-500 py-8 text-sm">No teams found.</p>
          ) : (
            filteredTeams.map((team) => (
              <div key={team.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-gray-200">{team.name}</h3>
                    <p className="text-xs text-cyan-400 truncate max-w-[200px]">{team.track}</p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-cyan-900/40 px-2 py-1 rounded text-cyan-300 border border-cyan-500/30">
                    #{team.teamNumber.toString().padStart(3, '0')}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-xs font-medium mt-3 pt-3 border-t border-white/5">
                  <span className={`flex items-center gap-1 ${team.checkedIn === team.size ? "text-cyan-400" : team.checkedIn > 0 ? "text-cyan-700" : "text-gray-600"}`}>
                    <UserCheck size={14} /> {team.checkedIn}/{team.size}
                  </span>
                  <span className={`flex items-center gap-1 ${team.lunch === team.size ? "text-green-400" : team.lunch > 0 ? "text-green-700" : "text-gray-600"}`}>
                    <Utensils size={14} /> {team.lunch}/{team.size}
                  </span>
                  <span className={`flex items-center gap-1 ${team.snacks === team.size ? "text-yellow-400" : team.snacks > 0 ? "text-yellow-700" : "text-gray-600"}`}>
                    <Coffee size={14} /> {team.snacks}/{team.size}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-40">
        <button 
          onClick={() => { setIsScanning(true); setScanState("idle"); }}
          className={`w-full max-w-sm text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg
            ${activeMode === "is_present" ? "bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/40" : 
              activeMode === "lunch_received" ? "bg-green-600 hover:bg-green-500 shadow-green-600/40" : 
              "bg-yellow-600 hover:bg-yellow-500 shadow-yellow-600/40"}`}
        >
          <ScanLine size={24} />
          SCAN FOR {activeMode.replace('_received', '').replace('is_', '').toUpperCase()}
        </button>
      </div>

      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden">
          
          <div className="flex justify-between items-center p-6 pb-0 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-white uppercase">
                {activeMode.replace('_received', '').replace('is_', '')} Scanner
              </h2>
            </div>
            <button onClick={resetScanner} className="bg-white/10 p-2 rounded-full text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="flex-grow flex flex-col overflow-y-auto p-6">
            
            {scanState === "idle" && (
              <div className="flex flex-col items-center justify-center h-full w-full">
                <p className="text-sm text-gray-400 mb-6">Align code within the frame</p>
                <QRScanner onScan={handleQRScan} onError={handleCameraError} />
                
                <div className="w-full max-w-sm mt-8 border-t border-white/10 pt-8">
                  <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-3 text-center flex items-center justify-center gap-2">
                    <Keyboard size={14} /> Manual Entry Fallback
                  </p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Enter Team No. (e.g. 5)" 
                      value={manualTeamInput}
                      onChange={(e) => setManualTeamInput(e.target.value)}
                      className="flex-grow bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500 transition-colors text-xs font-mono"
                    />
                    <button 
                      onClick={() => handleQRScan(manualTeamInput)}
                      disabled={!manualTeamInput.trim()}
                      className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 rounded-lg font-bold transition-colors"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            )}

            {scanState === "processing" && (
              <div className="flex flex-col items-center justify-center h-full text-cyan-400">
                <Loader2 className="animate-spin mb-4" size={48} />
                <p className="font-bold tracking-widest uppercase">Processing...</p>
              </div>
            )}

            {scanState === "verify_team" && verifyingTeam && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col h-full w-full max-w-sm mx-auto">
                <div className="bg-cyan-900/30 border border-cyan-500/50 rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-lg text-white">
                      {verifyingTeam.team_name}
                    </h3>
                    <span className="text-xs font-mono bg-cyan-500 text-black px-2 py-0.5 rounded font-bold">
                      #{verifyingTeam.team_number.toString().padStart(3, '0')}
                    </span>
                  </div>
                  <p className="text-xs text-cyan-300">{verifyingTeam.tracks.title}</p>
                </div>

                <p className="text-sm text-gray-400 mb-4 px-1">
                  Physically verify SRNs and select members to mark for: <strong className="text-white uppercase">{activeMode.replace('_received', '').replace('is_', '')}</strong>
                </p>

                <div className="space-y-3 flex-grow overflow-y-auto mb-6 pr-2 custom-scrollbar">
                  {verifyingTeam.candidates.map((candidate: any) => {
                    const alreadyProcessed = candidate[activeMode];
                    const isSelected = selectedMembers.has(candidate.id);

                    return (
                      <div 
                        key={candidate.id}
                        onClick={() => !alreadyProcessed && toggleMemberSelection(candidate.id)}
                        className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                          alreadyProcessed 
                            ? "bg-black/40 border-green-500/30 opacity-75 cursor-not-allowed" 
                            : isSelected 
                              ? "bg-cyan-600/20 border-cyan-500 cursor-pointer" 
                              : "bg-white/5 border-white/10 hover:border-white/30 cursor-pointer"
                        }`}
                      >
                        <div>
                          <p className="font-bold text-gray-200 text-sm flex items-center gap-2">
                            {candidate.full_name}
                            {candidate.is_leader && <span className="bg-cyan-500 text-black text-[9px] px-1.5 py-0.5 rounded uppercase font-bold">Leader</span>}
                          </p>
                          <p className="text-xs text-gray-500 font-mono mt-1 flex items-center gap-1">
                            <Hash size={12} /> {candidate.srn}
                          </p>
                        </div>
                        
                        <div>
                          {alreadyProcessed ? (
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-bold uppercase tracking-wider">Done</span>
                          ) : (
                            <div className={`w-6 h-6 rounded border flex items-center justify-center ${isSelected ? "bg-cyan-500 border-cyan-500" : "border-gray-500"}`}>
                              {isSelected && <CheckCircle2 size={16} className="text-black" />}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 mt-auto pt-4 shrink-0 border-t border-white/10">
                  <button onClick={() => setScanState("idle")} className="px-6 py-3 rounded-lg font-bold bg-white/10 hover:bg-white/20 transition-all text-gray-300">
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmVerification} 
                    disabled={selectedMembers.size === 0}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 py-3 rounded-lg font-bold uppercase transition-all shadow-lg text-white"
                  >
                    Confirm ({selectedMembers.size})
                  </button>
                </div>
              </div>
            )}

            {scanState === "success" && (
              <div className="flex flex-col items-center justify-center h-full text-center animate-in zoom-in duration-300">
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-4 border border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                  <CheckCircle2 className="text-green-400" size={48} />
                </div>
                <h3 className="text-2xl font-bold text-green-400 mb-2">VERIFIED & SAVED</h3>
                <p className="text-gray-300 px-4">{scanMessage}</p>
                <button onClick={() => setScanState("idle")} className="mt-8 bg-white/10 px-8 py-3 rounded-xl font-bold">Scan Next</button>
              </div>
            )}

            {scanState === "error" && (
              <div className="flex flex-col items-center justify-center h-full text-center animate-in zoom-in duration-300">
                <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-4 border border-red-500/50 shadow-lg">
                  <AlertTriangle className="text-red-400" size={48} />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-red-400">ERROR</h3>
                <p className="text-gray-300 px-4">{scanMessage}</p>
                <button onClick={() => setScanState("idle")} className="mt-8 bg-white/10 px-8 py-3 rounded-xl font-bold">Try Again</button>
              </div>
            )}

            {scanState === "camera_blocked" && (
              <div className="flex flex-col items-center justify-center h-full text-center animate-in zoom-in duration-300 w-full max-w-sm mx-auto">
                <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-4 border border-red-500/50 shadow-lg">
                  <AlertTriangle className="text-red-400" size={48} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-red-400">CAMERA BLOCKED</h3>
                <p className="text-gray-300 px-4 text-sm mb-8">{scanMessage}</p>
                
                <div className="w-full mt-8 border-t border-white/10 pt-8">
                  <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-3 text-center flex items-center justify-center gap-2">
                    <Keyboard size={14} /> Manual Entry Fallback
                  </p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Enter Team No. (e.g. 5)" 
                      value={manualTeamInput}
                      onChange={(e) => setManualTeamInput(e.target.value)}
                      className="flex-grow bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500 transition-colors text-xs font-mono"
                    />
                    <button 
                      onClick={() => handleQRScan(manualTeamInput)}
                      disabled={!manualTeamInput.trim()}
                      className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-6 rounded-lg font-bold transition-colors"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}