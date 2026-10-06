import React from 'react';

interface SectionHeadingProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  variant?: 'light' | 'dark';
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  kicker,
  title,
  subtitle,
  align = 'left',
  variant = 'light',
  action,
  className = '',
}) => {
  const isDark = variant === 'dark';
  const isCenter = align === 'center';

  return (
    <div
      className={`mb-10 md:mb-14 ${
        isCenter ? 'text-center mx-auto max-w-3xl' : 'flex flex-col md:flex-row md:items-end md:justify-between gap-6'
      } ${className}`}
    >
      <div className={isCenter ? 'mx-auto' : 'max-w-2xl'}>
        {kicker && (
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`text-xs font-bold uppercase tracking-widest ${
                isDark ? 'text-orange-400' : 'text-orange-600'
              }`}
            >
              {kicker}
            </span>
            <span
              className={`h-px w-6 ${isDark ? 'bg-stone-700' : 'bg-stone-300'}`}
              aria-hidden="true"
            />
          </div>
        )}
        <h2
          className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight ${
            isDark ? 'text-white' : 'text-stone-900'
          }`}
          style={{ textWrap: 'balance' }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className={`mt-3.5 text-base sm:text-lg leading-relaxed ${
              isDark ? 'text-stone-300' : 'text-stone-600'
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <div className={`shrink-0 ${isCenter ? 'mt-6 flex justify-center' : ''}`}>
          {action}
        </div>
      )}
    </div>
  );
};
