// app/page.tsx
import { VideoBackground } from "@/components/shared/VideoBackground";
import { LoginModule } from "@/components/auth/LoginModule";
import { RegistrationSection } from "@/components/registration/RegistrationSection";

export default function Home() {
  const backgroundVideoUrl = "/black-and-white-topography.3840x2160.mp4"; 

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 font-sans">
      <VideoBackground videoUrl={backgroundVideoUrl} overlayOpacity="bg-black/80" />

      {/* Main Glassmorphism Container */}
      <div className="relative z-10 w-full max-w-6xl rounded-2xl border border-white/10 bg-black/40 p-8 md:p-12 backdrop-blur-md shadow-2xl">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-12">
          {/* Official CodeChef SVG Logo */}
          <img 
            src="https://cdn.simpleicons.org/codechef/white" 
            alt="CodeChef Official Logo" 
            className="h-20 w-auto mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
          />
          <p className="text-gray-400 text-sm tracking-widest uppercase">
            PESU ECC Event Management System
          </p>
        </div>

        {/* Two-Column Grid for Login & Register */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Column 1: Login Module */}
          <div className="rounded-xl border border-white/10 bg-black/50 p-6 shadow-lg backdrop-blur-sm">
            <h2 className="text-2xl font-semibold text-white mb-2">Access Portal</h2>
            <p className="text-gray-400 text-sm mb-6">Select your role to continue.</p>
            <LoginModule />
          </div>

          {/* Column 2: Registration Module */}
          <div className="rounded-xl border border-white/10 bg-black/50 p-6 shadow-lg backdrop-blur-sm flex flex-col">
            <h2 className="text-2xl font-semibold text-white mb-4">Team Registration</h2>
            <RegistrationSection />
          </div>

        </div>
      </div>
    </main>
  );
}