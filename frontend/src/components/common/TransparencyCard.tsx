import React from 'react';
import { LucideIcon, ShieldCheck, Clock, ArrowRight } from 'lucide-react';

interface TransparencyCardProps {
  title: string;
  category: string;
  description: string;
  icon: LucideIcon;
  statusNote?: string;
  verifiedCount?: number | null; // null means awaiting real data
  metricLabel?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const TransparencyCard: React.FC<TransparencyCardProps> = ({
  title,
  category,
  description,
  icon: Icon,
  statusNote = "Verified financial data will appear here.",
  verifiedCount = null,
  metricLabel = "Records",
  actionText,
  onAction,
  className = "",
}) => {
  return (
    <div
      className={`rounded border border-stone-200 bg-white p-6 sm:p-7 flex flex-col justify-between hover:border-stone-300 transition-colors shadow-xs ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="w-10 h-10 rounded bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700">
            <Icon className="w-5 h-5 text-orange-600" />
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-stone-500 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{category}</span>
          </div>
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
          {title}
        </h3>

        <p className="mt-2 text-sm text-stone-600 leading-relaxed">
          {description}
        </p>

        {/* Real data slot or polished empty state */}
        <div className="mt-6 p-4 rounded bg-stone-50 border border-stone-200">
          {verifiedCount !== null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono-tabular text-stone-900">
                {verifiedCount}
              </span>
              <span className="text-xs text-stone-500">{metricLabel}</span>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 text-xs text-stone-600 font-mono">
              <Clock className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <span>{statusNote}</span>
            </div>
          )}
        </div>
      </div>

      {actionText && onAction && (
        <div className="mt-6 pt-4 border-t border-stone-100 flex justify-end">
          <button
            onClick={onAction}
            className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors"
          >
            <span>{actionText}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
