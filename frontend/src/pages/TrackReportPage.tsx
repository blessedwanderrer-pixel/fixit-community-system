import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Hash,
  LoaderCircle,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { PageHero } from '../components/common/PageHero';
import { CTA } from '../components/common/CTA';
import { ApiError, apiRequest } from '../lib/api';

type ReportStatus = 'Submitted' | 'Approved' | 'Rejected' | 'Scheduled' | 'In Progress' | 'Solved' | 'Cancelled';

interface TrackingReport {
  tracking_id: string;
  category: string | null;
  status: ReportStatus;
  created_at: string;
  status_changed_at: string;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  work_details: string | null;
}

interface TimelineEvent {
  label: string;
  at: string;
  detail?: string | null;
}

const trackingPattern = /^FIX-[A-Z0-9]+$/;

const statusClasses: Record<ReportStatus, string> = {
  Submitted: 'border-sky-200 bg-sky-50 text-sky-900',
  Approved: 'border-indigo-200 bg-indigo-50 text-indigo-900',
  Rejected: 'border-red-200 bg-red-50 text-red-900',
  Scheduled: 'border-purple-200 bg-purple-50 text-purple-900',
  'In Progress': 'border-amber-300 bg-amber-50 text-amber-900',
  Solved: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  Cancelled: 'border-stone-300 bg-stone-100 text-stone-700',
};

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

const buildTimeline = (report: TrackingReport): TimelineEvent[] => {
  const events: TimelineEvent[] = [{ label: 'Report Submitted', at: report.created_at }];
  if (report.status !== 'Submitted') {
    events.push({ label: `Current status: ${report.status}`, at: report.status_changed_at });
  }
  if (report.scheduled_for) {
    events.push({ label: 'Work Scheduled', at: report.scheduled_for, detail: report.work_details });
  }
  if (report.started_at) {
    events.push({ label: 'Work Started', at: report.started_at });
  }
  if (report.completed_at) {
    events.push({ label: 'Work Completed', at: report.completed_at });
  }
  return events.sort((first, second) => new Date(first.at).getTime() - new Date(second.at).getTime());
};

export const TrackReportPage: React.FC = () => {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [trackingId, setTrackingId] = useState(searchParams.get('id')?.toUpperCase() ?? '');
  const [report, setReport] = useState<TrackingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchReport = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = trackingId.trim().toUpperCase();
    setTrackingId(normalized);
    setReport(null);
    setNotFound(false);
    setError(null);

    if (!trackingPattern.test(normalized)) {
      setError('Enter a valid tracking ID beginning with FIX-.');
      return;
    }
    if (!session?.access_token) {
      setError('Your authenticated Citizen session is unavailable. Please sign in again.');
      return;
    }

    setLoading(true);
    try {
      const result = await apiRequest<TrackingReport>(`/api/reports/track/${encodeURIComponent(normalized)}`, {
        accessToken: session.access_token,
      });
      setReport(result);
      setSearchParams({ id: result.tracking_id }, { replace: true });
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) {
        setNotFound(true);
      } else {
        setError(cause instanceof Error ? cause.message : 'Unable to track this report.');
      }
    } finally {
      setLoading(false);
    }
  };

  const timeline = report ? buildTimeline(report) : [];

  return (
    <div className="w-full">
      <PageHero
        kicker="Citizen Report Tracking"
        title="Track Your Report"
        subtitle="Use your FixIt tracking ID to securely view the current status and available work progress for a report linked to your Citizen account."
        breadcrumbs={[{ label: 'Track Your Report' }]}
        badgeText="Authenticated Citizen Access"
        actionSecondary={{ label: 'Citizen Dashboard', href: '/citizen' }}
      />

      <section className="py-12 sm:py-20 bg-stone-50 border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <form onSubmit={(event) => void searchReport(event)} className="flex flex-col sm:flex-row gap-3">
              <label className="relative flex-1">
                <span className="sr-only">Tracking ID</span>
                <Hash className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="text" value={trackingId} onChange={(event) => setTrackingId(event.target.value.toUpperCase())} placeholder="Enter your FIX- tracking ID" autoComplete="off" spellCheck={false} required className="w-full pl-10 pr-4 py-3 text-sm font-mono uppercase border border-stone-300 rounded focus:outline-none focus:border-orange-500" />
              </label>
              <button type="submit" disabled={loading || !trackingId.trim()} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded bg-orange-600 hover:bg-orange-500 text-sm font-bold text-white disabled:bg-stone-400 disabled:cursor-wait">
                {loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}{loading ? 'Searching…' : 'Track Status'}
              </button>
            </form>
            <div className="mt-4 pt-4 border-t border-stone-100 flex items-start gap-2 text-xs text-stone-500"><ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />Only reports owned by or reporter-linked to your authenticated Citizen account can be retrieved.</div>
          </div>

          {notFound && <div role="status" className="mt-6 rounded border border-amber-200 bg-amber-50 p-5 flex items-start gap-3"><AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" /><div><h2 className="text-sm font-black text-amber-950">Report unavailable</h2><p className="mt-1 text-sm text-amber-900">No report linked to your Citizen account was found for that tracking ID. Check the ID and try again.</p></div></div>}
          {error && <div role="alert" className="mt-6 rounded border border-red-200 bg-red-50 p-5 flex items-start gap-3"><AlertTriangle className="w-5 h-5 text-red-700 shrink-0" /><span className="text-sm text-red-900">{error}</span></div>}

          {report && <div className="mt-8 space-y-6">
            <article className="rounded border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-stone-200"><div><div className="text-xs font-mono font-bold text-orange-700">{report.tracking_id}</div><h2 className="mt-2 text-2xl font-black text-stone-900">{report.category ?? 'Uncategorized'}</h2><p className="mt-1 text-xs text-stone-500">Submitted {formatDate(report.created_at)}</p></div><span className={`w-fit rounded border px-3 py-1.5 text-sm font-bold ${statusClasses[report.status]}`}>{report.status}</span></div>

              <div className="py-6 grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="rounded border border-stone-200 bg-stone-50 p-4"><div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase text-stone-500"><Clock3 className="w-4 h-4 text-orange-600" />Status Updated</div><div className="mt-2 text-sm font-bold text-stone-900">{formatDate(report.status_changed_at)}</div></div>{report.scheduled_for && <div className="rounded border border-stone-200 bg-stone-50 p-4"><div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase text-stone-500"><CalendarClock className="w-4 h-4 text-orange-600" />Scheduled For</div><div className="mt-2 text-sm font-bold text-stone-900">{formatDate(report.scheduled_for)}</div></div>}</div>

              {report.work_details && <div className="rounded border border-stone-200 bg-stone-50 p-4"><div className="text-[11px] font-mono font-bold uppercase text-stone-500">Work Details</div><p className="mt-2 text-sm leading-relaxed text-stone-700 whitespace-pre-wrap">{report.work_details}</p></div>}

              <div className="mt-7 pt-6 border-t border-stone-200"><h3 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-700">Progress Timeline</h3><div className="mt-5 space-y-4">{timeline.map((item, index) => <div key={`${item.label}-${item.at}`} className="flex items-start gap-3"><div className={`mt-1 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${index === timeline.length - 1 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}><CheckCircle2 className="w-4 h-4" /></div><div><div className="text-sm font-bold text-stone-900">{item.label}</div><div className="mt-0.5 text-xs text-stone-500">{formatDate(item.at)}</div>{item.detail && <p className="mt-1 text-xs text-stone-600">{item.detail}</p>}</div></div>)}</div></div>

              <div className="mt-7 pt-5 border-t border-stone-200 flex items-start gap-2 text-xs text-stone-500"><ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />Coordinates, reporter identities, evidence paths, AI triage, duplicate candidates and internal staff data are not included.</div>
            </article>
          </div>}
        </div>
      </section>
      <CTA />
    </div>
  );
};
