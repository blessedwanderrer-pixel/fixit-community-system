import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck, TrendingUp, WalletCards } from 'lucide-react';
import { PageHero } from '../components/common/PageHero';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { CTA } from '../components/common/CTA';
import { apiRequest } from '../lib/api';

interface CompletedWork {
  tracking_id: string;
  category: string | null;
  status: string;
  completed_at: string | null;
}

interface TransparencySummary {
  verified_donations_total: string | number;
  approved_spending_total: string | number;
  completed_work: CompletedWork[];
}

const formatMoney = (value: string | number) => new Intl.NumberFormat(undefined, {
  style: 'currency', currency: 'PKR', maximumFractionDigits: 2,
}).format(Number(value));

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

export const TransparencyPage: React.FC = () => {
  const [summary, setSummary] = useState<TransparencySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await apiRequest<TransparencySummary>('/api/transparency?currency=PKR'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load public transparency data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSummary(); }, [loadSummary]);

  return (
    <div className="w-full">
      <PageHero kicker="Public Accountability" title="Transparency" subtitle="See the verified donation total, approved spending total and completed community work reported by the FixIt backend." breadcrumbs={[{ label: 'Transparency' }]} badgeText="Public Verified Records" actionPrimary={{ label: 'How Verification Works', href: '/how-it-works' }} actionSecondary={{ label: 'Report a Problem', href: '/report' }} />
      <section className="bg-stone-900 text-stone-200 border-b border-stone-800 py-4 px-4 text-xs"><div className="max-w-7xl mx-auto flex items-start gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span><strong className="text-white">Verification scope:</strong> Only donations with status Verified and expenses with status Approved are included. Donor identities, receipts, exact locations and private records are never shown here.</span></div></section>

      <section className="py-16 sm:py-24 bg-stone-50 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"><div><div className="text-xs font-mono font-bold uppercase tracking-widest text-orange-600">Backend-Verified Summary</div><h2 className="mt-1 text-2xl sm:text-3xl font-black text-stone-900">Public Financial Overview</h2></div><button type="button" onClick={() => void loadSummary()} disabled={loading} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded border border-stone-300 bg-white text-xs font-bold text-stone-700 hover:border-orange-400 disabled:text-stone-400"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button></div>
          {error && <div role="alert" className="mb-8 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-900 flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}

          {loading ? <LoadingSkeleton type="metric" count={2} /> : summary && <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded border border-stone-200 bg-white p-6 sm:p-7 shadow-xs"><div className="w-10 h-10 rounded bg-orange-50 border border-orange-200 flex items-center justify-center"><WalletCards className="w-5 h-5 text-orange-600" /></div><div className="mt-5 text-xs font-mono font-bold uppercase tracking-wider text-stone-500">Verified Donations Total</div><div className="mt-2 text-3xl font-black text-stone-900 font-mono-tabular">{formatMoney(summary.verified_donations_total)}</div><p className="mt-3 text-sm text-stone-600">Includes only donations verified by an administrator against FixIt records.</p></div>
              <div className="rounded border border-stone-200 bg-white p-6 sm:p-7 shadow-xs"><div className="w-10 h-10 rounded bg-orange-50 border border-orange-200 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-orange-600" /></div><div className="mt-5 text-xs font-mono font-bold uppercase tracking-wider text-stone-500">Approved Spending Total</div><div className="mt-2 text-3xl font-black text-stone-900 font-mono-tabular">{formatMoney(summary.approved_spending_total)}</div><p className="mt-3 text-sm text-stone-600">Includes only expenses approved through the Admin review workflow.</p></div>
            </div>
            <div className="mt-12"><div className="flex items-center gap-2 mb-5"><CheckCircle2 className="w-5 h-5 text-emerald-700" /><h2 className="text-2xl font-black text-stone-900">Completed Work</h2></div>
              {summary.completed_work.length === 0 ? <EmptyState title="No completed work published yet" description="Completed community work returned by the public backend will appear here." note="No private report or location data is exposed." icon={CheckCircle2} badge="COMPLETED WORK" /> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{summary.completed_work.map((work) => <article key={work.tracking_id} className="rounded border border-stone-200 bg-white p-5 shadow-xs"><div className="flex items-start justify-between gap-3"><span className="rounded border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-mono font-bold text-orange-700">{work.tracking_id}</span><span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">{work.status}</span></div><h3 className="mt-4 text-lg font-black text-stone-900">{work.category ?? 'Uncategorized'}</h3>{work.completed_at && <p className="mt-2 text-xs text-stone-500">Completed {formatDate(work.completed_at)}</p>}</article>)}</div>}
            </div>
          </>}
        </div>
      </section>
      <CTA />
    </div>
  );
};
