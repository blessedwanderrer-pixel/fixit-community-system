import React from 'react';

interface LoadingSkeletonProps {
  type?: 'card' | 'table' | 'timeline' | 'metric';
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'card',
  count = 3,
  className = '',
}) => {
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === 'table') {
    return (
      <div className={`w-full divide-y divide-stone-200 border border-stone-200 rounded-lg overflow-hidden bg-white ${className}`} aria-busy="true" aria-label="Loading content">
        <div className="p-4 bg-stone-100 flex items-center justify-between animate-pulse">
          <div className="h-4 w-32 bg-stone-300 rounded" />
          <div className="h-4 w-24 bg-stone-300 rounded" />
        </div>
        {items.map((i) => (
          <div key={i} className="p-4 flex items-center justify-between animate-pulse">
            <div className="space-y-2">
              <div className="h-4 w-48 bg-stone-200 rounded" />
              <div className="h-3 w-32 bg-stone-100 rounded" />
            </div>
            <div className="h-6 w-20 bg-stone-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'metric') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {items.map((i) => (
          <div key={i} className="civic-card p-5 rounded-lg border border-stone-200 bg-white animate-pulse">
            <div className="h-3 w-24 bg-stone-200 rounded mb-3" />
            <div className="h-7 w-32 bg-stone-300 rounded mb-2" />
            <div className="h-3 w-40 bg-stone-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`}>
      {items.map((i) => (
        <div key={i} className="civic-card rounded-lg border border-stone-200 bg-white p-5 animate-pulse">
          <div className="aspect-16/9 bg-stone-200 rounded mb-4" />
          <div className="h-4 w-24 bg-stone-200 rounded mb-2" />
          <div className="h-5 w-48 bg-stone-300 rounded mb-3" />
          <div className="h-3 w-full bg-stone-100 rounded mb-1" />
          <div className="h-3 w-3/4 bg-stone-100 rounded" />
        </div>
      ))}
    </div>
  );
};
