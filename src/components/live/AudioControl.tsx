'use client';

import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundService } from '@/lib/soundService';

export default function AudioControl() {
  const [isMuted, setIsMuted] = useState(false);
  
  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    soundService.setMuted(newMuted);
  };
  
  return (
    <button
      onClick={toggleMute}
      className="fixed top-4 right-4 z-50 p-3 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-colors"
      aria-label={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted ? (
        <VolumeX className="w-6 h-6 text-white" />
      ) : (
        <Volume2 className="w-6 h-6 text-white" />
      )}
    </button>
  );
}
