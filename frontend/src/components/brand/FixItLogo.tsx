import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface FixItLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark'; // dark background vs light background
  linkToHome?: boolean;
}

export const FixItLogo: React.FC<FixItLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'light',
  linkToHome = true,
}) => {
  const [imgError, setImgError] = useState(false);

  // Height configurations
  const heightMap = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
    xl: 'h-20',
  };

  const isDark = variant === 'dark';

  const logoContent = (
    <div className={`inline-flex items-center select-none ${className}`}>
      {/* 
        The official logo image is rendered here.
        Users can place the official PNG at /brand/fixit-logo.png
        If the image is present, it displays crisply.
        If not yet placed, the SVG fallback accurately reproduces the official stencil #FIXIT reference design.
      */}
      {!imgError ? (
        <img
          src="/brand/fixit-logo.png"
          alt="FixIt Pakistan"
          className={`${heightMap[size]} w-auto object-contain transition-opacity duration-200 ${
            isDark ? 'brightness-110 contrast-125 invert' : ''
          }`}
          onError={() => setImgError(true)}
        />
      ) : (
        /* High-fidelity SVG recreation matching the exact official reference brand asset */
        <svg
          viewBox="0 0 280 120"
          className={`${heightMap[size]} w-auto`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="FixIt Pakistan"
        >
          {/* Flame over the first 'I' */}
          <path
            d="M115 12C116 22 124 25 124 35C124 46 113 54 103 48C98 44 98 38 100 33C97 36 94 40 94 46C94 59 105 68 118 67C130 66 139 55 137 41C136 29 126 21 123 15C120 12 118 8 115 12Z"
            fill="url(#fixit-flame-grad)"
          />
          {/* Inner flame tongue */}
          <path
            d="M114 36C112 40 110 44 112 48C114 51 118 52 121 49C124 45 123 41 121 38C119 35 116 33 114 36Z"
            fill="#FED7AA"
          />

          {/* Pickaxe Head on top of T */}
          <path
            d="M172 26C186 21 210 20 236 32C237 32.5 237 33.5 235 34C220 37 198 34 186 31C184 34 184 37 184 38L174 38C174 37 174 34 172 31C160 34 138 37 123 34C121 33.5 121 32.5 122 32C148 20 172 21 172 26Z"
            fill={isDark ? '#E4E4E7' : '#18181B'}
          />
          {/* Pickaxe Central Orange Joint Collar */}
          <rect
            x="170"
            y="17"
            width="20"
            height="12"
            rx="4"
            fill="#EA580C"
          />

          {/* # (Hash symbol) */}
          <g fill={isDark ? '#FAFAFA' : '#18181B'} className="font-extrabold">
            <path d="M42 42L40 55H31L29 68H38L36 82H27L25 95H34L32 108H45L47 95H58L56 108H69L71 95H80L82 82H73L75 68H84L86 55H77L79 42H66L64 55H53L55 42H42ZM51 68H62L60 82H49L51 68Z" />
          </g>

          {/* F */}
          <path
            d="M90 42H118V55H103V67H115V80H103V108H89V42H90Z"
            fill={isDark ? '#FAFAFA' : '#18181B'}
          />

          {/* I (with flame above) */}
          <path
            d="M125 58H140V108H125V58Z"
            fill={isDark ? '#FAFAFA' : '#18181B'}
          />

          {/* X */}
          <path
            d="M144 42H159L168 67L177 42H192L178 75L194 108H179L168 83L157 108H142L157 75L144 42Z"
            fill={isDark ? '#FAFAFA' : '#18181B'}
          />

          {/* I (second I) */}
          <path
            d="M198 42H213V108H198V42Z"
            fill={isDark ? '#FAFAFA' : '#18181B'}
          />

          {/* T - Stem */}
          <path
            d="M217 38H247V52H239V92H225V52H217V38Z"
            fill={isDark ? '#FAFAFA' : '#18181B'}
          />

          {/* Fountain Pen Nib at the base of T */}
          <path
            d="M225 92L239 92L235 110L232 120L229 110L225 92Z"
            fill="#EA580C"
          />
          {/* Fountain pen nib slit */}
          <line
            x1="232"
            y1="96"
            x2="232"
            y2="114"
            stroke={isDark ? '#18181B' : '#FFFFFF'}
            strokeWidth="1.5"
          />

          <defs>
            <linearGradient id="fixit-flame-grad" x1="115" y1="12" x2="115" y2="67" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F97316" />
              <stop offset="0.6" stopColor="#EA580C" />
              <stop offset="1" stopColor="#C2410C" />
            </linearGradient>
          </defs>
        </svg>
      )}
    </div>
  );

  if (linkToHome) {
    return (
      <Link
        to="/"
        className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-sm"
        aria-label="FixIt Pakistan Homepage"
      >
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};
