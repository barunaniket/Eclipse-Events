// components/shared/VideoBackground.tsx
import React from 'react';

interface VideoBackgroundProps {
  videoUrl: string;
  overlayOpacity?: string;
}

export const VideoBackground = ({ 
  videoUrl, 
  overlayOpacity = 'bg-black/60' 
}: VideoBackgroundProps) => {
  return (
    <div className="fixed top-0 left-0 w-full h-full z-[-1] overflow-hidden bg-[#050505]">
      {/* Dark overlay to make text readable */}
      <div className={`absolute inset-0 z-10 ${overlayOpacity}`}></div>
      
      <video
        autoPlay
        loop
        muted
        playsInline // Crucial for iOS to prevent the video from taking over the full screen player
        poster="/video-poster.jpg" // Added poster fallback!
        className="absolute min-w-full min-h-full object-cover top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70"
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};