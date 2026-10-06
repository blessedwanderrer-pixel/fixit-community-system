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
      className={`rounded border border-dashed border-stone-300 bg-stone-50/70 p-8 sm:p-12 text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-12 h-12 rounded bg-white border border-stone-200 flex items-center justify-center text-stone-500 shadow-xs mb-4">
        <Icon className="w-6 h-6 text-stone-600" />
      </div>

      <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-stone-500 bg-stone-200/60 px-2.5 py-1 rounded mb-3">
        <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
        <span>{badge}</span>
      </div>

      <h3 className="text-lg font-bold text-stone-900 tracking-tight max-w-md">
        {title}
      </h3>

      <p className="mt-2 text-sm text-stone-600 max-w-lg leading-relaxed">
        {description}
      </p>

      {note && (
        <div className="mt-4 flex items-center gap-1.5 text-xs text-stone-500 font-mono">
          <Clock className="w-3.5 h-3.5" />
          <span>{note}</span>
        </div>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};
