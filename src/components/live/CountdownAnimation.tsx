'use client';

import React, { useState, useEffect, useRef } from 'react';
import { soundService } from '@/lib/soundService';

interface CountdownAnimationProps {
  onComplete: () => void;
}

export default function CountdownAnimation({ onComplete }: CountdownAnimationProps) {
  const [count, setCount] = useState<number | string>(3);
  const [isVisible, setIsVisible] = useState(true);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Prevent countdown from running multiple times due to Strict Mode
    if (hasStartedRef.current) {
      return;
    }
    
    hasStartedRef.current = true;
    
    const countdown = [3, 2, 1, 'GO!'];
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < countdown.length) {
        const value = countdown[currentIndex];
        
        // Play tick sound for each countdown
        soundService.playTick();
        
        setCount(value);
        currentIndex++;
      } else {
        setIsVisible(false);
        onComplete();
        clearInterval(interval);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      // Reset ref so countdown can restart if component remounts
      hasStartedRef.current = false;
    };
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div 
        className="text-white font-bold animate-[ping_1s_ease-in-out]"
        style={{
          fontSize: count === 'GO!' ? '8rem' : '12rem',
          animation: 'scale-fade 1s ease-in-out'
        }}
      >
        {count}
      </div>

      <style jsx>{`
        @keyframes scale-fade {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
