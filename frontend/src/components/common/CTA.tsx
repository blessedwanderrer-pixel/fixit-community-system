import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, AlertCircle } from 'lucide-react';

interface CTAProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export const CTA: React.FC<CTAProps> = ({
  title = "Your community. Your report. Visible action.",
  subtitle = "Sign in as a Citizen to submit community infrastructure problems, receive a Tracking ID, and follow the safe status information linked to your account.",
  className = "",
}) => {
  return (
    <section className={`relative civic-noise overflow-hidden bg-stone-950 text-white py-20 sm:py-24 border-y border-stone-800 ${className}`}>
      {/* Background Accent Stripe */}
      <div className="absolute top-0 left-0 right-0 h-1 civic-stripe-accent" />
      <div className="absolute inset-0 civic-grid-dark opacity-30 pointer-events-none" />
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-600/10 blur-3xl" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-4 text-xs font-bold tracking-widest uppercase text-orange-400">
            <AlertCircle className="w-4 h-4" />
            <span>Citizen Action Platform</span>
          </div>

          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight"
            style={{ textWrap: 'balance' }}
          >
            {title}
          </h2>

          <p className="mt-4 text-base sm:text-lg text-stone-300 leading-relaxed max-w-2xl mx-auto">
            {subtitle}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/report"
              className="civic-button-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-white bg-orange-600 hover:bg-orange-500 rounded transition-colors whitespace-nowrap"
            >
              <span>Report a Problem</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/track"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-stone-200 hover:text-white bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded transition-colors whitespace-nowrap"
            >
              <Search className="w-4 h-4 text-orange-400" />
              <span>Track Your Report</span>
            </Link>
          </div>

          <div className="mt-8 pt-8 border-t border-stone-800/80 flex flex-wrap items-center justify-center gap-6 text-xs text-stone-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              Secure Citizen login required
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              Permanent Tracking ID generated
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              Private evidence, safe public summaries
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
