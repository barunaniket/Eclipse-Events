// components/registration/RegistrationSection.tsx
import React from "react";
import Link from "next/link";

export const RegistrationSection = () => {
  return (
    <div className="flex flex-col h-full">
      {/* First Come First Serve Alert */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
        <p className="text-yellow-400 text-sm font-mono uppercase flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
          </span>
          Alert: First come, first served.
        </p>
      </div>

      {/* Trigger Area */}
      <div className="flex-grow border-2 border-dashed border-gray-700/50 rounded-lg flex flex-col items-center justify-center p-8 min-h-[300px] bg-black/20">
        <h3 className="text-xl text-white font-semibold mb-2">Ready to compete?</h3>
        <p className="text-gray-400 text-sm text-center mb-8 max-w-xs">
          Gather your team, review the problem statements, and secure your spot.
        </p>
        
        <Link 
          href="/registration"
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-lg transition-all tracking-wider uppercase shadow-[0_0_15px_rgba(8,145,178,0.3)] hover:shadow-[0_0_25px_rgba(8,145,178,0.5)]"
        >
          Register Now
        </Link>
      </div>
    </div>
  );
};