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
      className={`relative bg-stone-900 text-white pt-14 pb-16 md:pt-20 md:pb-24 border-b border-stone-800 overflow-hidden ${className}`}
    >
      {/* Background Civic Grid Pattern */}
      <div className="absolute inset-0 civic-grid-dark opacity-40 pointer-events-none" />
      
      {/* Subtle safety orange accent glow in corner */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb line if available */}
        {breadcrumbs && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-stone-400 mb-6">
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <span className="text-stone-600">/</span>
                {crumb.href ? (
                  <Link to={crumb.href} className="hover:text-white transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-stone-300">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-orange-400">
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
            className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight"
            style={{ textWrap: 'balance' }}
          >
            {title}
          </h1>

          <p className="mt-5 text-base sm:text-lg text-stone-300 leading-relaxed max-w-2xl">
            {subtitle}
          </p>

          {(actionPrimary || actionSecondary) && (
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {actionPrimary && (
                <Link
                  to={actionPrimary.href}
                  className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-bold text-white bg-orange-600 hover:bg-orange-500 rounded transition-colors shadow-sm whitespace-nowrap"
                >
                  {actionPrimary.label}
                </Link>
              )}
              {actionSecondary && (
                <Link
                  to={actionSecondary.href}
                  className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-stone-200 hover:text-white bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded transition-colors whitespace-nowrap"
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
