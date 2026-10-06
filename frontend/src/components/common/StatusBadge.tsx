import React from 'react';

export type ReportStatus =
  | 'REPORTED'
  | 'UNDER_REVIEW'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'SOLVED'
  | 'DUPLICATE_LINKED';

interface StatusBadgeProps {
  status: ReportStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<
  ReportStatus,
  { label: string; dotColor: string; textColor: string; bgColor: string; borderColor: string }
> = {
  REPORTED: {
    label: 'Reported',
    dotColor: 'bg-stone-500',
    textColor: 'text-stone-700',
    bgColor: 'bg-stone-100',
    borderColor: 'border-stone-300',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    dotColor: 'bg-sky-600',
    textColor: 'text-sky-800',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
  },
  SCHEDULED: {
    label: 'Scheduled',
    dotColor: 'bg-purple-600',
    textColor: 'text-purple-800',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    dotColor: 'bg-amber-600',
    textColor: 'text-amber-900',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
  },
  SOLVED: {
    label: 'Solved',
    dotColor: 'bg-emerald-600',
    textColor: 'text-emerald-900',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
  },
  DUPLICATE_LINKED: {
    label: 'Linked to Existing',
    dotColor: 'bg-zinc-500',
    textColor: 'text-zinc-700',
    bgColor: 'bg-zinc-100',
    borderColor: 'border-zinc-300',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const conf = statusConfig[status] || statusConfig.REPORTED;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs font-semibold px-2.5 py-1 gap-2',
    lg: 'text-sm font-semibold px-3.5 py-1.5 gap-2.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded border font-medium ${conf.bgColor} ${conf.borderColor} ${conf.textColor} ${sizeClasses[size]} whitespace-nowrap shrink-0 ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${conf.dotColor} shrink-0`} aria-hidden="true" />
      <span>{conf.label}</span>
    </span>
  );
};
