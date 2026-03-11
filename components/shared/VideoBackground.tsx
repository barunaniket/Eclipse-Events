// components/shared/VideoBackground.tsx
import React from 'react';

interface VideoBackgroundProps {
  videoUrl: string;
  overlayOpacity?: string; // e.g., 'bg-black/50'
}

export const VideoBackground = ({ 
  videoUrl, 
  overlayOpacity = 'bg-black/60' 
}: VideoBackgroundProps) => {
  return (
    <div className="fixed top-0 left-0 w-full h-full z-[-1] overflow-hidden bg-black">
      {/* Dark overlay to make text readable */}
      <div className={`absolute inset-0 z-10 ${overlayOpacity}`}></div>
      
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute min-w-full min-h-full object-cover top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};