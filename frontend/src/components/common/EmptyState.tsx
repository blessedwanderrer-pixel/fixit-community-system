import React from 'react';
import { Database, ShieldCheck, LucideIcon, Clock } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  note?: string;
  icon?: LucideIcon;
  badge?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  note = "Awaiting real-time sync with FixIt verification backend.",
  icon: Icon = Database,
  badge = "AWAITING VERIFIED DATA",
  action,
  className = "",
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-dashed border-stone-300 bg-[linear-gradient(135deg,#fafaf9_0%,#f5f2eb_100%)] p-8 sm:p-12 text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="absolute inset-0 civic-grid-pattern opacity-40 pointer-events-none" aria-hidden="true" />
      <div className="relative w-12 h-12 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center text-orange-500 shadow-lg mb-4">
        <Icon className="w-6 h-6" />
      </div>

      <div className="relative inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-stone-500 bg-white px-2.5 py-1 rounded border border-stone-200 mb-3">
        <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
        <span>{badge}</span>
      </div>

      <h3 className="relative text-lg font-bold text-stone-900 tracking-tight max-w-md">
        {title}
      </h3>

      <p className="relative mt-2 text-sm text-stone-600 max-w-lg leading-relaxed">
        {description}
      </p>

      {note && (
        <div className="relative mt-4 flex items-center gap-1.5 text-xs text-stone-500 font-mono">
          <Clock className="w-3.5 h-3.5" />
          <span>{note}</span>
        </div>
      )}

      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
};
