// app/registration/page.tsx
import { VideoBackground } from "@/components/shared/VideoBackground";
import { DynamicRegistrationForm } from "@/components/registration/DynamicRegistrationForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function getTracks() {
  try {
    const { data, error } = await supabaseAdmin
      .from('tracks')
      .select('*, teams(count)')
      .order('id', { ascending: true });

    if (error) throw error;

    return data.map((track: any) => ({
      id: track.id,
      title: track.title,
      description: track.description,
      maxTeams: track.max_teams,
      registeredTeams: track.teams[0]?.count || 0,
    }));
  } catch {
    return [];
  }
}

export default async function RegistrationPage() {
  const backgroundVideoUrl = "/black-and-white-topography.3840x2160.mp4";
  const tracks = await getTracks();

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 lg:p-10 font-sans">
      <VideoBackground videoUrl={backgroundVideoUrl} overlayOpacity="bg-black/80" />

      <div className="relative z-10 w-full max-w-4xl lg:max-w-6xl rounded-2xl border border-white/10 bg-black/50 p-6 md:p-10 lg:p-12 backdrop-blur-xl shadow-2xl">

        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_1.3fr] lg:gap-12 lg:items-start">
          <div className="relative flex flex-col">
            <Link
              href="/"
              className="inline-flex items-center text-gray-400 hover:text-cyan-400 mb-8 transition-colors text-sm uppercase tracking-wider font-semibold lg:self-start"
            >
              <ArrowLeft size={18} className="mr-2" /> Back to Portal
            </Link>

            <div className="flex flex-col lg:items-center lg:text-center">
              <div className="mb-6">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-wide">
                  TEAM REGISTRATION
                </h1>
                <div className="h-1 w-24 bg-gradient-to-r from-cyan-400 to-purple-500 rounded lg:mx-auto"></div>
              </div>

              <p className="text-gray-400 text-sm max-w-md">
                Choose a track, add your members, and upload receipts. On desktop, your form stays visible while you read the guidelines.
              </p>

              <div className="w-full bg-[#121212] border border-white/5 rounded-3xl p-5 shadow-lg mt-8 lg:mt-10 max-w-md lg:text-left">
                <h3 className="font-bold text-gray-300 uppercase tracking-wider text-xs mb-4">Event Info</h3>
              <div className="space-y-3 text-sm text-gray-300">
                <p><span className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">📍 Location</span><br />MRD Auditorium, PES University</p>
                <p><span className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">📅 Date &amp; Time</span><br />March 28, 2026 — 8:00 AM to 6:00 PM</p>
                <p><span className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">🏆 Prize Pool</span><br />Rs 35000+</p>
                <p><span className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">🤝 Sponsors</span><br />C-DAC, Zintoo</p>
              </div>
            </div>

            <div className="w-full mt-8 lg:mt-10 max-w-md bg-[#121212] border border-white/5 rounded-3xl p-5 shadow-lg space-y-4 text-sm text-gray-300 text-left">
              <p className="font-semibold text-white">
                10 hours. Real problems. Real prizes. Zero excuses.
              </p>
              <p>
                Hosted by the Department of AIML x CodeChef.
              </p>
              <p>
                6 problem statements. You pick one. You build a solution. You ship it in 10 hours. No theory. No MCQs. Just you and your team going all in.
              </p>
              <p className="font-semibold tracking-wide text-white text-center">
                BUILD. CODE. INNOVATE 🔥.
              </p>
              <p className="font-semibold tracking-wide text-white text-center">
                Sponsored by C-DAC &amp; Zintoo. 🤝
              </p>
            </div>
          </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 lg:p-8">
            <DynamicRegistrationForm initialTracks={tracks} />
          </div>
        </div>

      </div>
    </main>
  );
}
