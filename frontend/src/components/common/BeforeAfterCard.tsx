import React, { useState } from 'react';
import { Camera, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { ASSETS } from '../../constants/assets';

interface BeforeAfterCardProps {
  title: string;
  trackingId: string;
  category: string;
  locationArea: string; // District/Area name only, no exact lat/long
  description: string;
  actionTaken: string;
  beforeImg?: string;
  afterImg?: string;
  className?: string;
}

export const BeforeAfterCard: React.FC<BeforeAfterCardProps> = ({
  title,
  trackingId,
  category,
  locationArea,
  description,
  actionTaken,
  beforeImg = ASSETS.heroCivicAction,
  afterImg = ASSETS.projectRoadRepair,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'comparison' | 'before' | 'after'>('comparison');

  return (
    <div className={`rounded border border-stone-300 bg-white shadow-xs overflow-hidden ${className}`}>
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 bg-stone-50">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-stone-500 mb-1">
            <span className="font-bold text-orange-600">{trackingId}</span>
            <span>·</span>
            <span>{category}</span>
            <span>·</span>
            <span>{locationArea}</span>
          </div>
          <h3 className="text-lg font-bold text-stone-900 leading-snug">
            {title}
          </h3>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 bg-stone-200 rounded text-xs">
          <button
            onClick={() => setViewMode('comparison')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              viewMode === 'comparison' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Split View
          </button>
          <button
            onClick={() => setViewMode('before')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              viewMode === 'before' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Before
          </button>
          <button
            onClick={() => setViewMode('after')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              viewMode === 'after' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            After
          </button>
        </div>
      </div>

      {/* Visual Presentation */}
      <div className="relative bg-stone-950">
        {viewMode === 'comparison' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-800">
            {/* Before Photo */}
            <div className="relative aspect-16/10 group overflow-hidden">
              <img
                src={beforeImg}
                alt={`Before fix: ${title}`}
                className="w-full h-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 bg-stone-900/90 text-white text-xs font-mono font-bold px-2 py-1 rounded border border-stone-700">
                BEFORE (REPORTED)
              </div>
            </div>

            {/* After Photo */}
            <div className="relative aspect-16/10 group overflow-hidden">
              <img
                src={afterImg}
                alt={`After verified fix: ${title}`}
                className="w-full h-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 bg-emerald-950/90 text-emerald-300 text-xs font-mono font-bold px-2 py-1 rounded border border-emerald-700 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                AFTER (SOLVED)
              </div>
            </div>
          </div>
        ) : viewMode === 'before' ? (
          <div className="relative aspect-16/9 sm:aspect-21/9 overflow-hidden">
            <img
              src={beforeImg}
              alt={`Before: ${title}`}
              className="w-full h-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-4 left-4 bg-stone-900/90 text-white text-xs font-mono font-bold px-3 py-1 rounded border border-stone-700">
              BEFORE: CITIZEN REPORT STAGE
            </div>
          </div>
        ) : (
          <div className="relative aspect-16/9 sm:aspect-21/9 overflow-hidden">
            <img
              src={afterImg}
              alt={`After: ${title}`}
              className="w-full h-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-4 left-4 bg-emerald-950/90 text-emerald-300 text-xs font-mono font-bold px-3 py-1 rounded border border-emerald-700 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              AFTER: FIELD COMPLETION & VERIFIED EVIDENCE
            </div>
          </div>
        )}
      </div>

      {/* Description & Action Log */}
      <div className="p-4 sm:p-6 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Problem Identified
            </div>
            <p className="text-stone-700 leading-relaxed">
              {description}
            </p>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">
              Action Taken & Solved
            </div>
            <p className="text-stone-700 leading-relaxed">
              {actionTaken}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-stone-400" />
            Verified by Ground Coordinator
          </span>
          <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Proof of Work Archival Record
          </span>
        </div>
      </div>
    </div>
  );
};
