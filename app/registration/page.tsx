// app/registration/page.tsx
import { VideoBackground } from "@/components/shared/VideoBackground";
import { DynamicRegistrationForm } from "@/components/registration/DynamicRegistrationForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function RegistrationPage() {
  const backgroundVideoUrl = "/black-and-white-topography.3840x2160.mp4"; 

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 font-sans">
      <VideoBackground videoUrl={backgroundVideoUrl} overlayOpacity="bg-black/80" />

      {/* Registration Form Container */}
      <div className="relative z-10 w-full max-w-4xl rounded-2xl border border-white/10 bg-black/50 p-6 md:p-10 backdrop-blur-xl shadow-2xl">
        
        {/* Navigation / Header */}
        <Link 
          href="/" 
          className="inline-flex items-center text-gray-400 hover:text-cyan-400 mb-8 transition-colors text-sm uppercase tracking-wider font-semibold"
        >
          <ArrowLeft size={18} className="mr-2" /> Back to Portal
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-wide">
            TEAM REGISTRATION
          </h1>
          <div className="h-1 w-24 bg-gradient-to-r from-cyan-400 to-purple-500 rounded"></div>
        </div>

        {/* Dynamic Form Area */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
           <DynamicRegistrationForm />
        </div>

      </div>
    </main>
  );
}