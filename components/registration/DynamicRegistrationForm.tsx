// components/registration/DynamicRegistrationForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { User, Mail, Phone, Upload, CheckCircle2, ChevronRight, Hash, Users, FileText, Loader2, AlertTriangle, Flag, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase"; 

interface Track {
  id: string;
  title: string;
  description: string;
  maxTeams: number;
  registeredTeams: number;
}

interface Credential {
  name: string;
  email: string;
  password: string;
}

export const DynamicRegistrationForm = () => {
  const [step, setStep] = useState(1);
  const [teamSize, setTeamSize] = useState(2);
  const [selectedProblem, setSelectedProblem] = useState("");
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [teamName, setTeamName] = useState("");

  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  
  // UPDATED: Now expects credentials array
  const [successData, setSuccessData] = useState<{ teamNumber: number; teamName: string; credentials: Credential[] } | null>(null);

  const [members, setMembers] = useState(
    Array(4).fill({ name: "", email: "", phone: "", srn: "" })
  );

  useEffect(() => {
    const fetchLiveTracks = async () => {
      try {
        const { data, error } = await supabase
          .from('tracks')
          .select('*, teams(count)')
          .order('id', { ascending: true });

        if (error) throw error;

        const liveTracks = data.map((track: any) => ({
          id: track.id,
          title: track.title,
          description: track.description,
          maxTeams: track.max_teams,
          registeredTeams: track.teams[0]?.count || 0, 
        }));

        setTracks(liveTracks);
      } catch (err) {
        console.error("Failed to fetch live tracks:", err);
      } finally {
        setIsLoadingTracks(false);
      }
    };

    fetchLiveTracks();
  }, []);

  const handleMemberChange = (index: number, field: string, value: string) => {
    const updatedMembers = [...members];
    updatedMembers[index] = { ...updatedMembers[index], [field]: value };
    setMembers(updatedMembers);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubmitError(""); 
    const file = e.target.files?.[0];
    
    if (!file) {
      setPaymentFile(null);
      return;
    }

    if (file.size > 1048576) {
      setSubmitError("File is too large. Maximum allowed size is 1MB.");
      setPaymentFile(null);
      e.target.value = ''; 
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setSubmitError("Invalid file format. Only JPG, PNG, and PDF are allowed.");
      setPaymentFile(null);
      e.target.value = ''; 
      return;
    }

    setPaymentFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");

    try {
      if (!teamName.trim()) throw new Error("Team Name is required.");
      if (!paymentFile) throw new Error("Payment receipt is missing.");

      const fileExt = paymentFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, paymentFile);

      if (uploadError) throw new Error("Failed to upload receipt. Please try again.");

      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);
      
      const receiptUrl = publicUrlData.publicUrl;

      const activeMembers = members.slice(0, teamSize);
      
      const payload = {
        teamName: teamName.trim(),
        trackId: selectedProblem,
        teamSize,
        receiptUrl,
        members: activeMembers
      };

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Try to parse JSON, but if it fails, read the raw text so we know what went wrong!
      let data;
      const rawText = await response.text();
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        console.error("Backend returned HTML instead of JSON. Raw response:", rawText);
        throw new Error("Server crashed. Check your Next.js terminal for the exact error.");
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to register team via API.");
      }

      // 4. Set success data AND the returned credentials
      setSuccessData({
        teamNumber: data.teamNumber,
        teamName: data.teamName,
        credentials: data.credentials
      });

    } catch (err: any) {
      console.error("Full Submission Error:", err);
      setSubmitError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN WITH CREDENTIALS
  if (successData) {
    return (
      <div className="w-full text-white min-h-[500px] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 border border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
           <CheckCircle2 className="text-green-400" size={32} />
        </div>
        
        <h2 className="text-2xl font-bold mb-1 tracking-wide text-white text-center">Registration Complete!</h2>
        <div className="flex items-center gap-3 mb-6">
          <p className="text-lg text-cyan-400 font-bold">{successData.teamName}</p>
          <span className="bg-white/10 text-cyan-400 font-mono text-xs font-bold px-2 py-1 rounded border border-cyan-500/30 uppercase">
            Team #{successData.teamNumber.toString().padStart(3, '0')}
          </span>
        </div>

        <div className="w-full max-w-md bg-red-900/20 border border-red-500/50 rounded-xl p-4 mb-6 text-center">
          <AlertTriangle className="text-red-400 mx-auto mb-2" size={24} />
          <p className="text-red-200 font-bold text-sm uppercase tracking-widest mb-1">Take a Screenshot Now!</p>
          <p className="text-xs text-red-300">These auto-generated passwords will only be shown once. You will need them to log into the Participant Hub on the day of the event.</p>
        </div>

        <div className="w-full max-w-md space-y-3 mb-8">
          {successData.credentials.map((cred, idx) => (
            <div key={idx} className="bg-black/50 border border-white/10 rounded-xl p-4 flex flex-col gap-2 relative">
              <span className="absolute top-0 right-0 bg-cyan-900/40 text-cyan-400 text-[9px] px-2 py-1 rounded-bl-lg rounded-tr-xl border-b border-l border-cyan-500/30 uppercase font-bold tracking-widest">
                {idx === 0 ? "Leader" : `Member ${idx + 1}`}
              </span>
              <p className="font-bold text-gray-200 text-sm">{cred.name}</p>
              
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <span className="text-gray-500 font-mono">Email:</span>
                <span className="text-cyan-300 font-mono select-all">{cred.email}</span>
                
                <span className="text-gray-500 font-mono">Pass:</span>
                <span className="text-yellow-400 font-mono font-bold tracking-wider select-all">{cred.password}</span>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => window.location.href = '/'} 
          className="bg-cyan-600 hover:bg-cyan-500 px-8 py-3 rounded-lg font-bold uppercase tracking-wider transition-colors shadow-lg"
        >
          Go to Login Portal
        </button>
      </div>
    );
  }

  // ... (The rest of the component remains exactly the same as before)
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
            <p className="text-gray-400 text-sm mb-6">Read the problem statements carefully. Registration is capped at 10 teams per track.</p>
            
            <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-4 custom-scrollbar mb-6 flex-grow">
              {isLoadingTracks ? (
                <div className="flex flex-col items-center justify-center h-40 text-cyan-500">
                  <Loader2 className="animate-spin mb-4" size={40} />
                  <p className="text-sm tracking-widest uppercase font-mono text-gray-400">Syncing live capacities...</p>
                </div>
              ) : (
                tracks.map((track) => {
                  const isFull = track.registeredTeams >= track.maxTeams;
                  const isSelected = selectedProblem === track.id;

                  return (
                    <div 
                      key={track.id} 
                      className={`p-6 rounded-xl border-2 transition-all ${
                        isSelected ? "bg-cyan-900/20 border-cyan-500" : 
                        isFull ? "bg-red-900/10 border-red-900/50 opacity-75" : 
                        "bg-black/40 border-white/10 hover:border-white/30"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h4 className={`text-lg font-bold ${isFull && !isSelected ? "text-gray-400" : "text-white"}`}>
                          {track.title}
                        </h4>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold ${
                          isFull ? "bg-red-500/20 text-red-400" : 
                          track.registeredTeams >= 8 ? "bg-yellow-500/20 text-yellow-400" : 
                          "bg-green-500/20 text-green-400"
                        }`}>
                          <Users size={14} />
                          {track.registeredTeams} / {track.maxTeams} Teams
                        </div>
                      </div>
                      
                      <div className="text-gray-400 text-sm leading-relaxed mb-6 whitespace-pre-line">
                        {track.description}
                      </div>

                      <button
                        type="button"
                        disabled={isFull}
                        onClick={() => setSelectedProblem(track.id)}
                        className={`w-full py-3 rounded-lg font-bold uppercase tracking-wider text-sm transition-all ${
                          isSelected ? "bg-cyan-600 text-white shadow-[0_0_15px_rgba(8,145,178,0.4)]" :
                          isFull ? "bg-gray-800 text-gray-500 cursor-not-allowed" :
                          "bg-white/5 hover:bg-white/10 text-gray-300"
                        }`}
                      >
                        {isSelected ? "Track Selected" : isFull ? "Track Full" : "Select This Track"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="pt-4 border-t border-white/10 mt-auto">
              <button 
                type="button" 
                onClick={() => setStep(2)} 
                disabled={!selectedProblem || isLoadingTracks}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-lg font-bold uppercase tracking-wide flex justify-center items-center gap-2 transition-all"
              >
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
               <select 
                 value={teamSize} 
                 onChange={(e) => setTeamSize(Number(e.target.value))}
                 className="bg-transparent text-white outline-none font-bold cursor-pointer"
               >
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
                  <input 
                    type="text" 
                    placeholder="Enter your team name..." 
                    required 
                    value={teamName} 
                    onChange={(e) => setTeamName(e.target.value)} 
                    className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 focus:border-cyan-500 focus:outline-none transition-colors text-white font-semibold" 
                  />
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
                   <div className="relative">
                     <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                     <input type="text" placeholder="PESU SRN" required value={members[index].srn} onChange={(e) => handleMemberChange(index, "srn", e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-cyan-500 focus:outline-none transition-colors uppercase" />
                   </div>
                   <div className="relative">
                     <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                     <input type="email" placeholder="Email Address" required value={members[index].email} onChange={(e) => handleMemberChange(index, "email", e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-cyan-500 focus:outline-none transition-colors" />
                   </div>
                   <div className="relative">
                     <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                     <input type="tel" placeholder="Phone Number" required value={members[index].phone} onChange={(e) => handleMemberChange(index, "phone", e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-cyan-500 focus:outline-none transition-colors" />
                   </div>
                 </div>
               </div>
             ))}
           </div>
           
           <div className="flex gap-4 pt-4 border-t border-white/10 mt-auto">
             <button type="button" onClick={() => setStep(1)} className="px-6 py-4 rounded-lg font-bold bg-white/5 hover:bg-white/10 transition-all text-gray-300">Back</button>
             <button type="button" onClick={() => {
               if(!teamName.trim()) { setSubmitError("Please enter a Team Name"); return; }
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
                  <li className="flex gap-3 items-start"><span className="text-cyan-400 font-mono font-bold shrink-0">2.</span> <span>Navigate to the <strong>Payments</strong> section.</span></li>
                  <li className="flex gap-3 items-start"><span className="text-cyan-400 font-mono font-bold shrink-0">3.</span> <span>Click on <strong>Miscellaneous Payments</strong>.</span></li>
                  <li className="flex gap-3 items-start"><span className="text-cyan-400 font-mono font-bold shrink-0">4.</span> <span>Select the event <strong>Eclipse</strong> from the dropdown.</span></li>
                  <li className="flex gap-3 items-start"><span className="text-cyan-400 font-mono font-bold shrink-0">5.</span> <span>Complete the transaction and <strong>download the receipt</strong>.</span></li>
                  <li className="flex gap-3 items-start"><span className="text-cyan-400 font-mono font-bold shrink-0">6.</span> <span>Upload the downloaded payment receipt here.</span></li>
                </ol>
              </div>

              <div className="border-2 border-dashed border-gray-600 hover:border-cyan-500/50 bg-black/40 rounded-xl p-6 flex flex-col items-center justify-center transition-colors cursor-pointer relative min-h-[250px]">
                <input 
                  type="file" 
                  accept=".pdf,image/png,image/jpeg,image/jpg" 
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-0" 
                  required
                  disabled={isSubmitting} 
                />
                {paymentFile ? (
                  <div className="text-center">
                    <CheckCircle2 className="text-green-400 mb-3 mx-auto" size={40} />
                    <p className="text-white font-medium break-all px-4">{paymentFile.name}</p>
                    <p className="text-xs text-green-400 mt-2 font-mono bg-green-900/20 py-1 px-3 rounded-full inline-block">File attached successfully</p>
                    <p className="text-xs text-gray-500 mt-4">Click anywhere to change file</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="text-gray-500 mb-4 mx-auto" size={40} />
                    <p className="text-gray-300 font-medium">Click or drag to upload receipt</p>
                    <p className="text-xs text-purple-400 mt-2 font-bold uppercase tracking-widest">Strict Limit: Max 1MB</p>
                    <p className="text-xs text-gray-500 mt-1">Supports PDF, PNG, JPG only.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-white/10 mt-auto">
              <button type="button" onClick={() => setStep(2)} disabled={isSubmitting} className="px-6 py-4 rounded-lg font-bold bg-white/5 hover:bg-white/10 disabled:opacity-50 transition-all text-gray-300">Back</button>
              <button type="submit" disabled={!paymentFile || isSubmitting} className="flex-1 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-lg font-bold uppercase tracking-wide flex justify-center items-center gap-2 transition-all shadow-lg">
                {isSubmitting ? (
                  <><Loader2 className="animate-spin" size={20} /> Processing...</>
                ) : (
                  "Complete Registration"
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};