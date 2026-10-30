import React from "react";

export interface SharerLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const SharerLogo: React.FC<SharerLogoProps> = ({ size = "md", className = "" }) => {
  const sizeMap = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-10 h-10",
    xl: "w-12 h-12",
  };

  const containerSize = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 select-none overflow-hidden ${containerSize} ${className}`}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <defs>
          <linearGradient id="sharerBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="sharerInnerDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0B132B" />
            <stop offset="100%" stopColor="#1C2541" />
          </linearGradient>
          <linearGradient id="sharerSparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67E8F9" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
        </defs>

        {/* Squircle Background */}
        <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#sharerBgGrad)" />
        <rect
          x="2.75"
          y="2.75"
          width="58.5"
          height="58.5"
          rx="15.25"
          stroke="#FFFFFF"
          strokeOpacity="0.25"
          strokeWidth="1.5"
        />

        {/* Inner Dark Chamber / Drive Window */}
        <rect
          x="12"
          y="16"
          width="40"
          height="32"
          rx="8"
          fill="url(#sharerInnerDark)"
          stroke="#FFFFFF"
          strokeOpacity="0.2"
          strokeWidth="2"
        />

        {/* Cloud / Share Folders Motif */}
        <path
          d="M22 28h8l3 3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H22a3 3 0 0 1-3-3V31a3 3 0 0 1 3-3z"
          fill="#3B82F6"
          fillOpacity="0.3"
          stroke="#60A5FA"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Vault / Uplink Share Nodes */}
        <circle cx="32" cy="37" r="3" fill="#67E8F9" />
        <path d="M26 33l6 4 6-4" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />

        {/* Top-Right Sparkle */}
        <path
          d="M48 7.5c.5 3 2.5 5 5.5 5.5-3 .5-5 2.5-5.5 5.5-.5-3-2.5-5-5.5-5.5 3-.5 5-2.5 5.5-5.5z"
          fill="url(#sharerSparkleGrad)"
        />
        <circle cx="41" cy="8.5" r="1.5" fill="#A5F3FC" />
      </svg>
    </div>
  );
};
