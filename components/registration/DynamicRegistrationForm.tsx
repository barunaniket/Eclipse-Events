// components/registration/DynamicRegistrationForm.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { User, Mail, Phone, Upload, CheckCircle2, ChevronRight, Hash, Users, FileText, Loader2, AlertTriangle, Flag, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase"; 
import { ProblemModal } from "./ProblemModal"; 

interface Track {
  id: string;
  title: string;
  description: string;
  maxTeams: number;
  registeredTeams: number;
}

interface Props {
  initialTracks?: Track[];
}

export const DynamicRegistrationForm = ({ initialTracks }: Props) => {
  const [step, setStep] = useState(1);
  const [teamSize, setTeamSize] = useState(2);
  const [selectedProblem, setSelectedProblem] = useState("");
  const [paymentFiles, setPaymentFiles] = useState<(File | null)[]>([]);
  const [teamName, setTeamName] = useState("");

  const hasInitialTracks = Array.isArray(initialTracks) && initialTracks.length > 0;
  const [tracks, setTracks] = useState<Track[]>(initialTracks ?? []);
  const [isLoadingTracks, setIsLoadingTracks] = useState(!hasInitialTracks);
  const [trackLoadError, setTrackLoadError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [viewingTrack, setViewingTrack] = useState<{id: string, title: string} | null>(null);

  const [successData, setSuccessData] = useState<{
    teamNumber: number;
    teamName: string;
    status: string;
  } | null>(null);

  const [members, setMembers] = useState(
    Array(4).fill({ name: "", email: "", phone: "", srn: "", cycle: "" })
  );

  const needsCycle = (srn: string) => srn.trim().toUpperCase().startsWith("PES2UG25");

  const fetchLiveTracks = useCallback(async () => {
    setIsLoadingTracks(true);
    setTrackLoadError("");
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*, teams(count)')
        .order('id', { ascending: true });

      if (error) throw error;

      setTracks((data ?? []).map((track: any) => ({
        id: track.id,
        title: track.title,
        description: track.description,
        maxTeams: track.max_teams,
        registeredTeams: track.teams[0]?.count || 0,
      })));
    } catch (err: any) {
      console.error("Failed to fetch live tracks:", err);
      setTrackLoadError(err?.message || "Failed to fetch live tracks.");
    } finally {
      setIsLoadingTracks(false);
    }
  }, []);

  useEffect(() => {
    if (hasInitialTracks) return;
    fetchLiveTracks();
  }, [fetchLiveTracks, hasInitialTracks]);

  const handleMemberChange = (index: number, field: string, value: string) => {
    const updatedMembers = [...members];
    const nextMember = { ...updatedMembers[index], [field]: value };
    if (field === "srn" && !needsCycle(value)) {
      nextMember.cycle = "";
    }
    updatedMembers[index] = nextMember;
    setMembers(updatedMembers);
  };

  // Fixed State Slicing Bug
  useEffect(() => {
    setPaymentFiles((prev) => Array(teamSize).fill(null).map((_, i) => prev[i] || null));
    setMembers((prev) => {
      const next = [...prev];
      for (let i = teamSize; i < 4; i++) {
        next[i] = { name: "", email: "", phone: "", srn: "", cycle: "" };
      }
      return next;
    });
  }, [teamSize]);

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    setSubmitError(""); 
    const file = e.target.files?.[0];
    
    if (!file) {
      setPaymentFiles((prev) => { const next = [...prev]; next[index] = null; return next; });
      return;
    }

    if (file.size > 1048576) {
      setSubmitError("File is too large. Maximum allowed size is 1MB.");
      setPaymentFiles((prev) => { const next = [...prev]; next[index] = null; return next; });
      e.target.value = ''; 
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setSubmitError("Invalid file format. Only JPG, PNG, and PDF are allowed.");
      setPaymentFiles((prev) => { const next = [...prev]; next[index] = null; return next; });
      e.target.value = ''; 
      return;
    }

    setPaymentFiles((prev) => { const next = [...prev]; next[index] = file; return next; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    
    const uploadedFilePaths: string[] = [];

    try {
      if (!teamName.trim()) throw new Error("Team Name is required.");
      if (paymentFiles.length !== teamSize || paymentFiles.some((f) => !f)) {
        throw new Error("All payment receipts are required.");
      }

      // 1. Upload files first
      const receiptUrls: string[] = [];
      for (const file of paymentFiles) {
        const safeFile = file as File;
        const fileExt = safeFile.name.split('.').pop();
        const filePath = `public/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, safeFile);
        if (uploadError) throw new Error("Failed to upload receipt. Please try again.");

        uploadedFilePaths.push(filePath); // Track for rollback
        
        const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(filePath);
        receiptUrls.push(publicUrlData.publicUrl);
      }

      // 2. API Call
      const payload = {
        teamName: teamName.trim(),
        trackId: selectedProblem,
        teamSize,
        receiptUrls,
        members: members.slice(0, teamSize)
      };

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Registration failed.");

      setSuccessData(data);

    } catch (err: any) {
      console.error("Submission Error:", err);
      // 3. Rollback leaked files on backend error
      if (uploadedFilePaths.length > 0) {
        await supabase.storage.from('receipts').remove(uploadedFilePaths).catch(console.error);
      }
      setSubmitError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className="w-full text-white min-h-[500px] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6 border border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
           <Clock className="text-yellow-400" size={40} />
        </div>
        
        <h2 className="text-3xl font-black mb-2 tracking-wide text-white text-center">Registration Under Review</h2>
        <div className="flex items-center gap-3 mb-8">
          <p className="text-xl text-cyan-400 font-bold">{successData.teamName}</p>
          <span className="bg-white/10 text-cyan-400 font-mono text-sm font-bold px-2 py-1 rounded border border-cyan-500/30 uppercase">
            Team #{successData.teamNumber.toString().padStart(3, '0')}
          </span>
        </div>

        <div className="w-full max-w-md bg-black/50 border border-yellow-500/30 rounded-2xl p-6 mb-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-yellow-600"></div>
          <h3 className="text-lg font-bold text-yellow-400 mb-3">What happens next?</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            We have successfully received your payment receipt. Our organizing team is currently reviewing your transaction.
          </p>
          <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-left">
            <p className="text-sm text-gray-400 mb-2">An email has been sent to the <strong>Team Leader</strong> confirming this submission.</p>
            <p className="text-sm text-gray-200">Once your payment is verified, <strong>all team members</strong> will receive individual emails containing their secure passwords.</p>
          </div>
        </div>

        <button 
          onClick={() => window.location.href = '/'} 
          className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-8 py-3 rounded-lg font-bold uppercase tracking-wider transition-colors shadow-lg"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="w-full text-white">
      <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
        {["Problem Selection", "Team Details", "Payment & Upload"].map((label, i) => (
          <div key={i} className={`flex-1 text-center text-xs font-mono uppercase tracking-wider ${step >= i + 1 ? "text-cyan-400" : "text-gray-600"}`}>
            Step {i + 1}: <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="min-h-[500px] flex flex-col">
        
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full flex-grow">
            <h3 className="text-xl font-semibold mb-2 text-cyan-400">Review & Select Track</h3>
            <p className="text-gray-400 text-sm mb-6">Read the problem statements carefully. Registration is capped.</p>
            
            <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-4 custom-scrollbar mb-6 flex-grow">
              {isLoadingTracks ? (
                <div className="flex flex-col items-center justify-center h-40 text-cyan-500">
                  <Loader2 className="animate-spin mb-4" size={40} />
                  <p className="text-sm tracking-widest uppercase font-mono text-gray-400">Syncing live capacities...</p>
                </div>
              ) : tracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center text-gray-400 gap-3">
                  <p className="text-sm tracking-widest uppercase font-mono">No tracks available</p>
                  <button type="button" onClick={fetchLiveTracks} className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors">Retry</button>
                </div>
              ) : (
                tracks.map((track) => {
                  const isFull = track.registeredTeams >= track.maxTeams;
                  const isSelected = selectedProblem === track.id;

                  return (
                    <div key={track.id} className={`p-6 rounded-xl border-2 transition-all ${isSelected ? "bg-cyan-900/20 border-cyan-500" : isFull ? "bg-red-900/10 border-red-900/50 opacity-75" : "bg-black/40 border-white/10 hover:border-white/30"}`}>
                      <div className="flex justify-between items-start mb-4">
                        <h4 className={`text-lg font-bold ${isFull && !isSelected ? "text-gray-400" : "text-white"}`}>{track.title}</h4>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold leading-none ${isFull ? "bg-red-500/20 text-red-400" : track.registeredTeams >= track.maxTeams * 0.8 ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}>
                          <Users size={14} />
                          <span className="flex flex-col items-center leading-none">
                            <span className="text-[11px] tabular-nums">{track.registeredTeams}/{track.maxTeams}</span>
                            <span className="text-[9px] uppercase tracking-widest">Teams</span>
                          </span>
                        </div>
                      </div>
                      <div className="text-gray-400 text-sm leading-relaxed mb-6 whitespace-pre-line">{track.description}</div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button type="button" onClick={() => setViewingTrack({ id: track.id, title: track.title })} className="flex-1 py-3 rounded-lg font-bold uppercase tracking-wider text-xs transition-all bg-[#121212] border border-white/10 hover:bg-white/10 text-gray-300 flex justify-center items-center gap-2">
                          <FileText size={16} /> Read Full Details
                        </button>
                        <button type="button" disabled={isFull} onClick={() => setSelectedProblem(track.id)} className={`flex-1 py-3 rounded-lg font-bold uppercase tracking-wider text-xs transition-all ${isSelected ? "bg-cyan-600 text-white shadow-[0_0_15px_rgba(8,145,178,0.4)]" : isFull ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5"}`}>
                          {isSelected ? "Track Selected" : isFull ? "Track Full" : "Select This Track"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="pt-4 border-t border-white/10 mt-auto">
              <button type="button" onClick={() => setStep(2)} disabled={!selectedProblem || isLoadingTracks} className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-lg font-bold uppercase tracking-wide flex justify-center items-center gap-2 transition-all">
                Proceed to Team Details <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full flex-grow">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-semibold text-cyan-400">Team Details</h3>
             <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
               <label className="text-sm text-gray-400">Team Size:</label>
               <select value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))} className="bg-transparent text-white outline-none font-bold cursor-pointer">
                 <option className="bg-gray-900" value={1}>1 Member (Solo)</option>
                 <option className="bg-gray-900" value={2}>2 Members</option>
                 <option className="bg-gray-900" value={3}>3 Members</option>
                 <option className="bg-gray-900" value={4}>4 Members</option>
               </select>
             </div>
           </div>

           <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar mb-6 flex-grow">
             <div className="bg-cyan-900/10 border border-cyan-500/30 p-5 rounded-xl mb-6">
                <label className="block text-sm font-bold text-cyan-400 mb-2 uppercase tracking-wider">Official Team Name</label>
                <div className="relative">
                  <Flag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input type="text" placeholder="Enter your team name..." required value={teamName} onChange={(e) => setTeamName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 focus:border-cyan-500 focus:outline-none transition-colors text-white font-semibold" />
                </div>
             </div>

             {Array.from({ length: teamSize }).map((_, index) => (
               <div key={index} className="bg-black/40 border border-white/5 p-5 rounded-xl">
                 <h4 className="text-sm font-semibold text-purple-400 mb-4 uppercase tracking-wider">
                   {index === 0 ? "Team Leader" : `Team Member ${index + 1}`}
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="relative">
                     <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                     <input type="text" placeholder="Full Name" required value={members[index].name} onChange={(e) => handleMemberChange(index, "name", e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-cyan-500 focus:outline-none transition-colors" />
                   </div>
                   
                   {/* UPDATED: SRN Input with Pattern Validation */}
                   <div className="relative">
                     <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                     <input 
                      type="text" 
                      placeholder="PESU SRN" 
                      required 
                      pattern="^PES[12](?:UG|PG)\d{2}(?:CS|EC|AM|AI|IS|EE|ME|CV|BT|AD)\d{3}$"
                      title="Must be a valid PESU SRN (e.g., PES1UG21CS123)"
                      value={members[index].srn} 
                      onChange={(e) => handleMemberChange(index, "srn", e.target.value.toUpperCase())} 
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-cyan-500 focus:outline-none transition-colors uppercase" 
                     />
                   </div>

                   {needsCycle(members[index].srn) && (
                     <div className="relative">
                       <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                       <select required value={members[index].cycle} onChange={(e) => handleMemberChange(index, "cycle", e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-cyan-500 focus:outline-none transition-colors">
                         <option className="bg-gray-900" value="">Select Cycle</option>
                         <option className="bg-gray-900" value="physics">Physics Cycle</option>
                         <option className="bg-gray-900" value="chemistry">Chemistry Cycle</option>
                       </select>
                     </div>
                   )}
                   <div className="relative">
                     <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                     <input type="email" placeholder="Email Address" required value={members[index].email} onChange={(e) => handleMemberChange(index, "email", e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-cyan-500 focus:outline-none transition-colors" />
                   </div>
                   
                   {/* UPDATED: Phone Input with Pattern Validation */}
                   <div className="relative">
                     <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                     <input 
                      type="tel" 
                      placeholder="Phone Number" 
                      required 
                      pattern="^(?:([+]\d{1,4})[-.\s]?)?(?:[(](\d{1,3})[)][-.\s]?)?(\d{1,4})[-.\s]?(\d{1,4})[-.\s]?(\d{1,9})$"
                      title="Valid phone number required (e.g., +91 9876543210)"
                      value={members[index].phone} 
                      onChange={(e) => handleMemberChange(index, "phone", e.target.value)} 
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-cyan-500 focus:outline-none transition-colors" 
                     />
                   </div>
                 </div>
               </div>
             ))}
           </div>
           
           <div className="flex gap-4 pt-4 border-t border-white/10 mt-auto">
             <button type="button" onClick={() => setStep(1)} className="px-6 py-4 rounded-lg font-bold bg-white/5 hover:bg-white/10 transition-all text-gray-300">Back</button>
             <button type="button" onClick={() => {
               if(!teamName.trim()) { setSubmitError("Please enter a Team Name"); return; }
               // Basic form validation check before advancing
               const form = document.querySelector('form');
               if (form && !form.checkValidity()) {
                 form.reportValidity();
                 return;
               }
               setSubmitError("");
               setStep(3);
             }} className="flex-1 bg-cyan-600 hover:bg-cyan-500 py-4 rounded-lg font-bold uppercase tracking-wide flex justify-center items-center gap-2 transition-all">Proceed to Payment <ChevronRight size={18} /></button>
           </div>
         </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full flex-grow">
            <h3 className="text-xl font-semibold mb-6 text-cyan-400">Payment & Verification</h3>
            
          {submitError && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6 text-sm flex items-start gap-3">
              <AlertTriangle size={20} className="shrink-0 text-red-400" />
              <span><strong>Error:</strong> {submitError}</span>
            </div>
          )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6 flex-grow">
              <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-purple-400" /> Payment Steps
                </h4>
                <ol className="space-y-4 text-sm text-gray-300">
                  <li className="flex gap-3 items-start"><span className="text-cyan-400 font-mono font-bold shrink-0">1.</span> <span>Open PESU Academy.</span></li>
                  <li className="flex gap-3 items-start"><span className="text-cyan-400 font-mono font-bold shrink-0">2.</span> <span>Navigate to <strong>Payments</strong> section.</span></li>
                  <li className="flex gap-3 items-start"><span className="text-cyan-400 font-mono font-bold shrink-0">3.</span> <span>Click <strong>Miscellaneous Payments</strong>.</span></li>
                  <li className="flex gap-3 items-start"><span className="text-cyan-400 font-mono font-bold shrink-0">4.</span> <span>Select event <strong>Eclipse</strong>.</span></li>
                  <li className="flex gap-3 items-start"><span className="text-cyan-400 font-mono font-bold shrink-0">5.</span> <span>Download the receipt.</span></li>
                  <li className="flex gap-3 items-start"><span className="text-cyan-400 font-mono font-bold shrink-0">6.</span> <span>Upload receipt for each member.</span></li>
                </ol>
              </div>

              <div className="space-y-4">
                {Array.from({ length: teamSize }).map((_, index) => {
                  const currentFile = paymentFiles[index] || null;
                  return (
                    <div key={index} className="border-2 border-dashed border-gray-600 hover:border-cyan-500/50 bg-black/40 rounded-xl p-5 flex flex-col items-center justify-center transition-colors cursor-pointer relative min-h-[210px]">
                      <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Attach Payment of Member {index + 1}</p>
                      <input type="file" accept=".pdf,image/png,image/jpeg,image/jpg" onChange={(e) => handleFileChange(index, e)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-0" required disabled={isSubmitting} />
                      {currentFile ? (
                        <div className="text-center">
                          <CheckCircle2 className="text-green-400 mb-3 mx-auto" size={36} />
                          <p className="text-white font-medium break-all px-4 text-sm">{currentFile.name}</p>
                          <p className="text-xs text-green-400 mt-2 font-mono bg-green-900/20 py-1 px-3 rounded-full inline-block">File attached</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="text-gray-500 mb-3 mx-auto" size={36} />
                          <p className="text-gray-300 font-medium text-sm">Click or drag to upload receipt</p>
                          <p className="text-xs text-purple-400 mt-2 font-bold uppercase tracking-widest">Strict Limit: Max 1MB</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-white/10 mt-auto">
              <button type="button" onClick={() => setStep(2)} disabled={isSubmitting} className="px-6 py-4 rounded-lg font-bold bg-white/5 hover:bg-white/10 disabled:opacity-50 transition-all text-gray-300">Back</button>
              <button type="submit" disabled={paymentFiles.length !== teamSize || paymentFiles.some((f) => !f) || isSubmitting} className="flex-1 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-lg font-bold uppercase tracking-wide flex justify-center items-center gap-2 transition-all shadow-lg">
                {isSubmitting ? <><Loader2 className="animate-spin" size={20} /> Processing...</> : "Submit Registration"}
              </button>
            </div>
          </div>
        )}
      </form>

      {viewingTrack && (
        <ProblemModal trackId={viewingTrack.id} trackTitle={viewingTrack.title} onClose={() => setViewingTrack(null)} />
      )}
    </div>
  );
};
