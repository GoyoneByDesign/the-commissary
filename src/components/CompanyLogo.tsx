import React from 'react';

interface CompanyLogoProps {
  className?: string;
  showWhiteBackdrop?: boolean;
  customLogo?: string | null;
}

/**
 * GoyoneByDesign (GBD) Official Company Logo
 * Features the signature black diamond with bold interlocking G-B-D letterforms.
 */
export default function CompanyLogo({ className = 'w-10 h-10', showWhiteBackdrop = false, customLogo }: CompanyLogoProps) {
  const [localLogo, setLocalLogo] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleLogoUpdate = () => {
      const stored = localStorage.getItem('applet_custom_logo');
      setLocalLogo(stored);
    };
    handleLogoUpdate();
    window.addEventListener('storage', handleLogoUpdate);
    window.addEventListener('logo-updated', handleLogoUpdate);
    return () => {
      window.removeEventListener('storage', handleLogoUpdate);
      window.removeEventListener('logo-updated', handleLogoUpdate);
    };
  }, []);

  const logoSrc = customLogo || localLogo;

  if (logoSrc) {
    return (
      <img 
        src={logoSrc} 
        alt="GoyoneByDesign Logo" 
        className={`${className} object-contain transition-all duration-300 hover:scale-105 select-none rounded`}
        id="company-gbd-logo-img"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <svg 
      viewBox="0 0 512 512" 
      className={`${className} transition-all duration-300 hover:scale-105 select-none`}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      id="company-gbd-logo-svg"
    >
      <defs>
        {/* Soft dropshadow for the beautiful diamond logo */}
        <filter id="gbdShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#000000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* 1. BLACK DIAMOND BACKDROP */}
      <polygon 
        points="256,12 500,256 256,500 12,256" 
        fill="#000000" 
        filter="url(#gbdShadow)" 
        id="company-diamond"
      />

      {/* 2. THE CHUNKY LETTERS G-B-D WITH TRANSLUCENCY OVERLAPS */}
      <g style={{ fontFamily: "'Montserrat', 'Inter', 'Arial Black', sans-serif", fontWeight: 900, letterSpacing: '-0.05em' }}>
        {/* Letter G (Solid Red) */}
        <text 
          x="208" 
          y="238" 
          fontSize="185" 
          fill="#e52427" 
          textAnchor="middle" 
          dominantBaseline="middle"
          id="company-letter-g"
        >
          G
        </text>

        {/* Letter D (Solid Light Blue) */}
        <text 
          x="320" 
          y="316" 
          fontSize="185" 
          fill="#139ee3" 
          textAnchor="middle" 
          dominantBaseline="middle"
          id="company-letter-d"
        >
          D
        </text>

        {/* Letter B (Translucent Yellow/Gold on top of both) */}
        <text 
          x="264" 
          y="278" 
          fontSize="185" 
          fill="#ffdf00" 
          fillOpacity="0.75"
          textAnchor="middle" 
          dominantBaseline="middle"
          id="company-letter-b"
        >
          B
        </text>
      </g>
    </svg>
  );
}
