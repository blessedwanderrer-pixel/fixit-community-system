import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Calendar, RefreshCw, ShieldCheck } from 'lucide-react';
import { PageHero } from '../components/common/PageHero';
import { UpcomingWorkCard, UpcomingWorkItem } from '../components/common/UpcomingWorkCard';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { CTA } from '../components/common/CTA';
import { apiRequest } from '../lib/api';

export const UpcomingWorkPage: React.FC = () => {
  const [items, setItems] = useState<UpcomingWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUpcomingWork = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await apiRequest<UpcomingWorkItem[]>('/api/upcoming-work'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load upcoming work.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUpcomingWork(); }, [loadUpcomingWork]);

  return (
    <div className="w-full">
      <PageHero kicker="Operations Dispatch" title="Upcoming Work" subtitle="Review community work that has been scheduled through the FixIt coordination workflow." breadcrumbs={[{ label: 'Upcoming Work' }]} badgeText="Public Work Schedule" actionPrimary={{ label: 'Report a Hazard', href: '/report' }} />
      <section className="bg-stone-900 text-stone-200 border-b border-stone-800 py-4 px-4 text-xs"><div className="max-w-7xl mx-auto flex items-start gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span><strong className="text-white">Privacy protection:</strong> This schedule shows only the tracking ID, category, status, scheduled time and coordinator-provided work details. Exact locations and private report information are not published.</span></div></section>
      <section className="py-16 sm:py-24 bg-stone-50 border-b border-stone-200"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"><div><div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-orange-600"><Calendar className="w-4 h-4" />Scheduled Field Work</div><h2 className="mt-2 text-2xl sm:text-3xl font-black text-stone-900">Upcoming Operations</h2></div><button type="button" onClick={() => void loadUpcomingWork()} disabled={loading} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded border border-stone-300 bg-white text-xs font-bold text-stone-700 hover:border-orange-400 disabled:text-stone-400"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh Schedule</button></div>
        {error && <div role="alert" className="mb-8 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-900 flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}
        {loading ? <LoadingSkeleton type="card" count={2} /> : items.length === 0 ? <EmptyState title="No upcoming work is scheduled" description="Scheduled work returned by the public backend will appear here." note="The schedule is public and does not require login." icon={Calendar} badge="UPCOMING WORK" /> : <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{items.map((item) => <UpcomingWorkCard key={item.tracking_id} item={item} />)}</div>}
      </div></section>
      <CTA />
    </div>
  );
};
