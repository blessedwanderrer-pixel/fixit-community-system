import React from 'react';
import { Link } from 'react-router-dom';

interface PageHeroProps {
  kicker: string;
  title: string;
  subtitle: string;
  actionPrimary?: { label: string; href: string };
  actionSecondary?: { label: string; href: string };
  breadcrumbs?: { label: string; href?: string }[];
  badgeText?: string;
  className?: string;
}

export const PageHero: React.FC<PageHeroProps> = ({
  kicker,
  title,
  subtitle,
  actionPrimary,
  actionSecondary,
  breadcrumbs,
  badgeText,
  className = '',
}) => {
  return (
    <section
      className={`relative bg-[#fffdf8] text-stone-950 pt-12 pb-14 md:pt-16 md:pb-20 border-b border-stone-200 overflow-hidden ${className}`}
    >
      {/* Background Civic Grid Pattern */}
      <div className="absolute inset-0 civic-grid-pattern opacity-45 pointer-events-none" />
      
      {/* Subtle safety orange accent glow in corner */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute left-[7%] top-0 h-full w-px bg-orange-500/25 pointer-events-none" aria-hidden="true" />
      <div className="absolute left-[7%] top-8 h-2 w-2 -translate-x-1/2 rounded-full bg-orange-500 pointer-events-none" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb line if available */}
        {breadcrumbs && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-stone-400 mb-6">
            <Link to="/" className="hover:text-orange-600 transition-colors">
              Home
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <span className="text-stone-600">/</span>
                {crumb.href ? (
                  <Link to={crumb.href} className="hover:text-orange-600 transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-stone-700">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className="civic-label text-orange-600 editorial-rule">
              {kicker}
            </span>
            {badgeText && (
              <>
                <span className="text-stone-600" aria-hidden="true">·</span>
                <span className="text-xs text-stone-400">{badgeText}</span>
              </>
            )}
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-[-0.055em] text-stone-950 leading-[0.92]"
            style={{ textWrap: 'balance' }}
          >
            {title}
          </h1>

          <p className="mt-5 text-base sm:text-lg text-stone-600 leading-relaxed max-w-2xl">
            {subtitle}
          </p>

          {(actionPrimary || actionSecondary) && (
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {actionPrimary && (
                <Link
                  to={actionPrimary.href}
                  className="fixit-button-primary justify-center whitespace-nowrap"
                >
                  {actionPrimary.label}
                </Link>
              )}
              {actionSecondary && (
                <Link
                  to={actionSecondary.href}
                  className="fixit-button-secondary justify-center whitespace-nowrap"
                >
                  {actionSecondary.label}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
