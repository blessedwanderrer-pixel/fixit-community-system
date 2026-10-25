import React from 'react';
import { Link } from 'react-router-dom';

interface FixItLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
  linkToHome?: boolean;
}

export const FixItLogo: React.FC<FixItLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'light',
  linkToHome = true,
}) => {
  const heightMap = {
    sm: 'h-9',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-24',
  };

  const logoContent = (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src={variant === 'light' ? '/brand/fixit-logo-transparent.png' : '/brand/fixit-logo.png'}
        alt="#FIXIT Pakistan"
        className={`${heightMap[size]} w-auto object-contain`}
      />
    </div>
  );

  if (linkToHome) {
    return (
      <Link
        to="/"
        className="inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        aria-label="FixIt Pakistan Homepage"
      >
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};
