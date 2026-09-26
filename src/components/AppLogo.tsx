import React from 'react';

interface AppLogoProps {
  className?: string;
  showWhiteBackdrop?: boolean;
}

/**
 * The Commissary Official Application Logo & Icon
 * 
 * Distinctive restaurant commissary inventory mark featuring:
 * - Rounded squircle app-icon badge with obsidian/midnight slate gradient & golden rim
 * - Restaurant Commissary cloche / warehouse dome with gleaming golden finish
 * - Central vocal microphone with voice frequency equalizer waves for hands-free counting
 * - Soundwave broadcast arcs representing real-time voice intelligence
 */
export default function AppLogo({ className = 'w-12 h-12', showWhiteBackdrop = false }: AppLogoProps) {
  return (
    <svg 
      viewBox="0 0 512 512" 
      className={`${className} transition-all duration-300 select-none drop-shadow-md`}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      id="the-commissary-app-logo"
    >
      <defs>
        {/* Background Gradient: Deep Luxury Midnight Slate */}
        <linearGradient id="commissaryBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="50%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#090d16" />
        </linearGradient>

        {/* Gold Accent Gradient */}
        <linearGradient id="commissaryGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="35%" stopColor="#fbbf24" />
          <stop offset="70%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>

        {/* Cloche Dome Inner Gradient */}
        <linearGradient id="clocheInner" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
        </linearGradient>

        {/* Microphone Capsule Gradient */}
        <linearGradient id="micGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* Gold Glow Filter */}
        <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#f59e0b" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* 1. App Icon Squircle Container */}
      <rect 
        x="24" 
        y="24" 
        width="464" 
        height="464" 
        rx="112" 
        fill="url(#commissaryBg)" 
        stroke="url(#commissaryGold)" 
        strokeWidth="10" 
      />

      {/* Subtle Radial Atmosphere */}
      <circle cx="256" cy="200" r="160" fill="#f59e0b" fillOpacity="0.09" />

      {/* 2. Restaurant Commissary Cloche / Dome */}
      {/* Cloche Top Handle Knob */}
      <circle cx="256" cy="116" r="22" fill="url(#commissaryGold)" filter="url(#goldGlow)" />
      <path d="M246 134h20v18h-20z" fill="url(#commissaryGold)" />

      {/* Cloche Dome Arc */}
      <path 
        d="M104 316 C104 175, 196 150, 256 150 C316 150, 408 175, 408 316 Z" 
        fill="url(#clocheInner)" 
        stroke="url(#commissaryGold)" 
        strokeWidth="12" 
        strokeLinejoin="round" 
      />

      {/* Cloche Base Serving Tray Rim */}
      <rect x="80" y="316" width="352" height="26" rx="13" fill="url(#commissaryGold)" filter="url(#goldGlow)" />
      <rect x="100" y="348" width="312" height="10" rx="5" fill="#f59e0b" fillOpacity="0.5" />

      {/* 3. Central Voice Audio Spectrum & Microphone */}
      {/* Left Equalizer Bars */}
      <rect x="174" y="240" width="12" height="46" rx="6" fill="#fbbf24" fillOpacity="0.75" />
      <rect x="202" y="214" width="12" height="74" rx="6" fill="#fde68a" />

      {/* Center Vocal Microphone */}
      <rect x="236" y="184" width="40" height="72" rx="20" fill="url(#micGradient)" filter="url(#goldGlow)" />
      {/* Mic Mesh Lines */}
      <line x1="244" y1="210" x2="268" y2="210" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="244" y1="220" x2="268" y2="220" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="244" y1="230" x2="268" y2="230" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />

      {/* Mic U-Bracket & Stand */}
      <path 
        d="M226 226 c0 24 14 38 30 38 s30 -14 30 -38" 
        fill="none" 
        stroke="url(#commissaryGold)" 
        strokeWidth="8" 
        strokeLinecap="round" 
      />
      <path d="M256 264 v26 M236 290 h40" stroke="url(#commissaryGold)" strokeWidth="8" strokeLinecap="round" />

      {/* Right Equalizer Bars */}
      <rect x="298" y="214" width="12" height="74" rx="6" fill="#fde68a" />
      <rect x="326" y="240" width="12" height="46" rx="6" fill="#fbbf24" fillOpacity="0.75" />

      {/* 4. Radiating Broadcast Voice Waves (Hands-Free Signal) */}
      <path d="M68 220 C48 248, 48 284, 68 310" stroke="#fbbf24" strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M46 195 C18 236, 18 296, 46 335" stroke="#f59e0b" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.35" />

      <path d="M444 220 C464 248, 464 284, 444 310" stroke="#fbbf24" strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M466 195 C494 236, 494 296, 466 335" stroke="#f59e0b" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.35" />

      {/* 5. Bottom "VOICE INVENTORY" Pill Badge */}
      <g transform="translate(166, 384)">
        <rect width="180" height="34" rx="17" fill="#0f172a" stroke="url(#commissaryGold)" strokeWidth="3" />
        <path d="M26 17 L34 24 L48 10" stroke="#10b981" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <text 
          x="58" 
          y="22" 
          fill="#ffffff" 
          fontFamily="'Montserrat', 'Inter', sans-serif" 
          fontWeight="900" 
          fontSize="12.5" 
          letterSpacing="1.5"
        >
          COMMISSARY
        </text>
      </g>
    </svg>
  );
}
