// components/registration/RegistrationModal.tsx
"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface RegistrationModalProps {
  onClose: () => void;
}

export const RegistrationModal = ({ onClose }: RegistrationModalProps) => {
  // We'll use this state to manage the First-Come-First-Serve multi-step flow
  const [step, setStep] = useState(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-white mb-2">Team Registration</h2>
        <div className="h-1 w-20 bg-gradient-to-r from-cyan-400 to-purple-500 rounded mb-6"></div>

        {/* Modal Content - We will build the dynamic logic here next */}
        <div className="flex-grow flex flex-col items-center justify-center text-center py-12">
           <h3 className="text-xl text-white font-semibold mb-4">Step {step}: Problem Statements</h3>
           <p className="text-gray-400 text-sm mb-8">
             [ We will add the problem statement review and dynamic team selection form here ]
           </p>
           
           <button 
             onClick={() => setStep(step + 1)}
             className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-6 rounded-lg transition-all"
           >
             Continue to Team Details
           </button>
        </div>

      </div>
    </div>
  );
};