import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  FileCheck2,
  FileSearch,
  HandCoins,
  Image,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { PageHero } from '../components/common/PageHero';
import { ApiError, apiBlob, apiRequest } from '../lib/api';
import { useFeedback } from '../ui/FeedbackContext';
import { AnimatedNumber } from '../components/common/AnimatedNumber';

type ReportStatus = 'Submitted' | 'Approved' | 'Rejected' | 'Scheduled' | 'In Progress' | 'Solved' | 'Cancelled';
type DonationStatus = 'Pending' | 'Verified' | 'Rejected';
type ExpenseStatus = 'Pending' | 'Approved' | 'Rejected';
type Section = 'analytics' | 'reports' | 'donations' | 'expenses';

interface Report {
  id: string;
  tracking_id: string;
  description: string;
  category: string | null;
  status: ReportStatus;
  created_at: string;
  possible_duplicate: boolean;
  duplicate_candidate_count: number;
  ai_triage_status: string | null;
}

interface DuplicateCandidate {
  id: string;
  candidate_report: Report;
  distance_meters: number;
  status: string;
  created_at: string;
}

interface ReportReview {
  report: Report;
  duplicate_candidates: DuplicateCandidate[];
  ai_triage: { id: string; result: Record<string, string>; created_at: string } | null;
}

interface Donation {
  id: string;
  transaction_id: string;
  amount: string | number;
  currency: string;
  transaction_at: string;
  status: DonationStatus;
  created_at: string;
}

interface Expense {
  id: string;
  report_id: string;
  amount: string | number;
  currency: string;
  description: string;
  status: ExpenseStatus;
  created_at: string;
}

interface Analytics {
  problems: {
    total_reports: number;
    awaiting_review_submitted: number;
    approved: number;
    scheduled: number;
    in_progress: number;
    solved: number;
    duplicate_merged: number;
  };
  financial: {
    currency: string;
    total_verified_donations: number;
    total_verified_donation_amount: string | number;
    pending_donation_verification: number;
    total_approved_spending: string | number;
  };
}

interface PrivateImage {
  kind: 'donation' | 'expense';
  id: string;
  title: string;
  url: string;
}

interface ReportPhoto {
  reportId: string;
  url: string;
}

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const formatMoney = (value: string | number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value));
const errorMessage = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;

const MetricCard: React.FC<{ label: string; value: string | number; accent?: boolean }> = ({ label, value, accent }) => (
  <div className={`rounded border p-5 shadow-xs ${accent ? 'border-orange-200 bg-orange-50' : 'border-stone-200 bg-white'}`}>
    <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-500">{label}</div>
    <div className="mt-2 text-2xl font-black text-stone-900">{typeof value === 'number' ? <AnimatedNumber value={value} /> : value}</div>
  </div>
);

const QueueEmpty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500">{children}</div>
);

export const AdminDashboardPage: React.FC = () => {
  const { session, user } = useAuth();
  const { playFeedback } = useFeedback();
  const [section, setSection] = useState<Section>('analytics');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [review, setReview] = useState<ReportReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [mutationKey, setMutationKey] = useState<string | null>(null);
  const [imageLoadingKey, setImageLoadingKey] = useState<string | null>(null);
  const [privateImage, setPrivateImage] = useState<PrivateImage | null>(null);
  const [reportPhoto, setReportPhoto] = useState<ReportPhoto | null>(null);
  const [reportPhotoLoading, setReportPhotoLoading] = useState(false);
  const [reportPhotoError, setReportPhotoError] = useState<string | null>(null);
  const [reportPhotoMissing, setReportPhotoMissing] = useState(false);

  const accessToken = session?.access_token;

  const loadDashboard = useCallback(async () => {
    if (!accessToken) {
      setError('Your authenticated session is unavailable. Please sign in again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [metrics, submitted, pendingDonations, pendingExpenses] = await Promise.all([
        apiRequest<Analytics>('/api/admin/analytics?currency=PKR', { accessToken }),
        apiRequest<Report[]>('/api/admin/reports/submitted', { accessToken }),
        apiRequest<Donation[]>('/api/admin/donations/pending', { accessToken }),
        apiRequest<Expense[]>('/api/admin/expenses/pending', { accessToken }),
      ]);
      setAnalytics(metrics);
      setReports(submitted);
      setDonations(pendingDonations);
      setExpenses(pendingExpenses);
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to load the Admin dashboard.'));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);
  useEffect(() => () => { if (privateImage) URL.revokeObjectURL(privateImage.url); }, [privateImage]);
  useEffect(() => () => { if (reportPhoto) URL.revokeObjectURL(reportPhoto.url); }, [reportPhoto]);

  const openReportReview = async (reportId: string) => {
    if (!accessToken || reviewLoading) return;
    setReviewLoading(true);
    setReviewError(null);
    setReportPhoto(null);
    setReportPhotoError(null);
    setReportPhotoMissing(false);
    try {
      const reportReview = await apiRequest<ReportReview>(`/api/admin/reports/${reportId}/review`, { accessToken });
      setReview(reportReview);
      setReportPhotoLoading(true);
      try {
        const blob = await apiBlob(`/api/admin/reports/${reportId}/photo`, { accessToken });
        setReportPhoto({ reportId, url: URL.createObjectURL(blob) });
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 404) {
          setReportPhotoMissing(true);
        } else {
          setReportPhotoError(errorMessage(cause, 'Unable to load the submitted problem photo.'));
        }
      } finally {
        setReportPhotoLoading(false);
      }
    } catch (cause) {
      setReviewError(errorMessage(cause, 'Unable to load the report review.'));
    } finally {
      setReviewLoading(false);
    }
  };

  const decideReport = async (status: 'Approved' | 'Rejected') => {
    if (!accessToken || !review || mutationKey) return;
    const key = `report:${review.report.id}`;
    setMutationKey(key);
    setReviewError(null);
    try {
      await apiRequest<Report>(`/api/admin/reports/${review.report.id}/decision`, {
        method: 'POST', accessToken, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      setReports((current) => current.filter((item) => item.id !== review.report.id));
      setReview(null);
      setReportPhoto(null);
      setNotice(`Report decision recorded as ${status}.`);
      playFeedback('success');
      void loadDashboard();
    } catch (cause) {
      setReviewError(errorMessage(cause, 'Unable to record the report decision.'));
      playFeedback('error');
    } finally {
      setMutationKey(null);
    }
  };

  const mergeReport = async (target: Report) => {
    if (!accessToken || !review || mutationKey) return;
    if (!window.confirm(`Merge ${review.report.tracking_id} into ${target.tracking_id}? This is an explicit Admin action.`)) return;
    const key = `report:${review.report.id}`;
    setMutationKey(key);
    setReviewError(null);
    try {
      await apiRequest(`/api/admin/reports/${review.report.id}/merge`, {
        method: 'POST', accessToken, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_report_id: target.id }),
      });
      setReports((current) => current.filter((item) => item.id !== review.report.id));
      setReview(null);
      setReportPhoto(null);
      setNotice(`Report merged into ${target.tracking_id}.`);
      playFeedback('success');
      void loadDashboard();
    } catch (cause) {
      setReviewError(errorMessage(cause, 'Unable to merge the report.'));
      playFeedback('error');
    } finally {
      setMutationKey(null);
    }
  };

  const viewPrivateImage = async (kind: 'donation' | 'expense', id: string, title: string) => {
    if (!accessToken || imageLoadingKey) return;
    const key = `${kind}:${id}`;
    setImageLoadingKey(key);
    setError(null);
    try {
      const suffix = kind === 'donation' ? 'proof' : 'receipt';
      const blob = await apiBlob(`/api/admin/${kind}s/${id}/${suffix}`, { accessToken });
      setPrivateImage({ kind, id, title, url: URL.createObjectURL(blob) });
    } catch (cause) {
      setError(errorMessage(cause, `Unable to load the private ${kind === 'donation' ? 'proof' : 'receipt'}.`));
    } finally {
      setImageLoadingKey(null);
    }
  };

  const reviewDonation = async (id: string, status: 'Verified' | 'Rejected') => {
    if (!accessToken || mutationKey) return;
    const key = `donation:${id}`;
    setMutationKey(key);
    setError(null);
    try {
      await apiRequest<Donation>(`/api/admin/donations/${id}/review`, {
        method: 'POST', accessToken, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      setDonations((current) => current.filter((item) => item.id !== id));
      setPrivateImage(null);
      setNotice(`Donation review recorded as ${status}.`);
      playFeedback('success');
      void loadDashboard();
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to review the donation.'));
      playFeedback('error');
    } finally {
      setMutationKey(null);
    }
  };

  const reviewExpense = async (id: string, status: 'Approved' | 'Rejected') => {
    if (!accessToken || mutationKey) return;
    const key = `expense:${id}`;
    setMutationKey(key);
    setError(null);
    try {
      await apiRequest<Expense>(`/api/admin/expenses/${id}/review`, {
        method: 'POST', accessToken, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      setExpenses((current) => current.filter((item) => item.id !== id));
      setPrivateImage(null);
      setNotice(`Expense review recorded as ${status}.`);
      playFeedback('success');
      void loadDashboard();
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to review the expense.'));
      playFeedback('error');
    } finally {
      setMutationKey(null);
    }
  };

  const tabs: Array<{ id: Section; label: string; count?: number }> = [
    { id: 'analytics', label: 'Analytics' },
    { id: 'reports', label: 'Report Review', count: reports.length },
    { id: 'donations', label: 'Donations', count: donations.length },
    { id: 'expenses', label: 'Expenses', count: expenses.length },
  ];

  return (
    <div className="w-full">
      <PageHero kicker="Administration" title="Admin Dashboard" subtitle="Review reports and verify FixIt financial records through authenticated backend workflows." breadcrumbs={[{ label: 'Admin Dashboard' }]} badgeText="Backend-Verified Admin Session" />
      <section className="py-12 sm:py-16 bg-stone-50 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded border border-stone-200 bg-white p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500">Authenticated Administrator</div>
              <div className="mt-1 text-sm font-bold text-stone-900">{user?.email ?? 'Admin account'}</div>
            </div>
            <button type="button" onClick={() => void loadDashboard()} disabled={loading} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded border border-stone-200 text-xs font-bold text-stone-700 hover:border-orange-400 disabled:text-stone-400">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Admin dashboard sections">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" role="tab" aria-selected={section === tab.id} onClick={() => setSection(tab.id)} className={`shrink-0 rounded px-4 py-2.5 text-xs font-bold border ${section === tab.id ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-200 hover:border-orange-400'}`}>
                {tab.label}{tab.count === undefined ? '' : ` (${tab.count})`}
              </button>
            ))}
          </div>

          {error && <div role="alert" className="mt-5 p-4 rounded border border-red-200 bg-red-50 text-sm text-red-900 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}
          {notice && <div role="status" className="mt-5 p-4 rounded border border-emerald-200 bg-emerald-50 text-sm text-emerald-900 flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />{notice}</div>}

          {loading ? (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Loading Admin dashboard">{[0, 1, 2, 3].map((item) => <div key={item} className="h-28 rounded bg-white border border-stone-200 animate-pulse" />)}</div>
          ) : (
            <div className="mt-8">
              {section === 'analytics' && analytics && (
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-orange-600" /><h2 className="text-xl font-black text-stone-900">Report Metrics</h2></div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <MetricCard label="Total reports" value={analytics.problems.total_reports} accent />
                      <MetricCard label="Awaiting review" value={analytics.problems.awaiting_review_submitted} />
                      <MetricCard label="Approved" value={analytics.problems.approved} />
                      <MetricCard label="Scheduled" value={analytics.problems.scheduled} />
                      <MetricCard label="In progress" value={analytics.problems.in_progress} />
                      <MetricCard label="Solved" value={analytics.problems.solved} />
                      <MetricCard label="Duplicate merged" value={analytics.problems.duplicate_merged} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-4"><HandCoins className="w-5 h-5 text-orange-600" /><h2 className="text-xl font-black text-stone-900">Financial Metrics</h2></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <MetricCard label="Verified donations" value={analytics.financial.total_verified_donations} />
                      <MetricCard label="Verified donation amount" value={formatMoney(analytics.financial.total_verified_donation_amount, analytics.financial.currency)} accent />
                      <MetricCard label="Pending donation verification" value={analytics.financial.pending_donation_verification} />
                      <MetricCard label="Approved spending" value={formatMoney(analytics.financial.total_approved_spending, analytics.financial.currency)} />
                    </div>
                  </div>
                </div>
              )}

              {section === 'reports' && (
                <div>
                  <div className="mb-5"><div className="text-xs font-mono font-bold uppercase tracking-widest text-orange-600">Submitted Queue</div><h2 className="mt-1 text-2xl font-black text-stone-900">Report Review</h2></div>
                  {reports.length === 0 ? <QueueEmpty>No submitted reports are awaiting review.</QueueEmpty> : <div className="space-y-3">{reports.map((report) => (
                    <div key={report.id} className="rounded border border-stone-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div><div className="font-mono text-xs font-bold text-stone-900">{report.tracking_id}</div><div className="mt-1 text-sm font-bold text-stone-800">{report.category ?? 'Uncategorized'}</div><div className="mt-1 text-xs text-stone-500">Submitted {formatDate(report.created_at)}</div>{report.possible_duplicate && <div className="mt-2 text-xs font-bold text-amber-800">Possible Duplicate · {report.duplicate_candidate_count} candidate(s)</div>}</div>
                      <button type="button" onClick={() => void openReportReview(report.id)} disabled={reviewLoading} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold disabled:bg-stone-400"><FileSearch className="w-4 h-4" />{reviewLoading ? 'Loading…' : 'Open Review'}</button>
                    </div>
                  ))}</div>}
                  {reviewError && !review && <div role="alert" className="mt-4 p-4 border border-red-200 bg-red-50 rounded text-sm text-red-900">{reviewError}</div>}
                </div>
              )}

              {section === 'donations' && (
                <div>
                  <div className="mb-5"><div className="text-xs font-mono font-bold uppercase tracking-widest text-orange-600">Private Verification Queue</div><h2 className="mt-1 text-2xl font-black text-stone-900">Pending Donations</h2></div>
                  {donations.length === 0 ? <QueueEmpty>No donations are awaiting verification.</QueueEmpty> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{donations.map((donation) => (
                    <div key={donation.id} className="rounded border border-stone-200 bg-white p-5 shadow-xs"><div className="flex justify-between gap-3"><div><div className="text-xs font-mono font-bold text-stone-900">{donation.transaction_id}</div><div className="mt-2 text-xl font-black text-stone-900">{formatMoney(donation.amount, donation.currency)}</div></div><span className="h-fit rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900">{donation.status}</span></div><div className="mt-2 text-xs text-stone-500">Transaction: {formatDate(donation.transaction_at)}</div><button type="button" onClick={() => void viewPrivateImage('donation', donation.id, `Donation proof · ${donation.transaction_id}`)} disabled={imageLoadingKey !== null} className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-stone-300 text-xs font-bold text-stone-800 hover:border-orange-400 disabled:text-stone-400"><Image className="w-4 h-4" />{imageLoadingKey === `donation:${donation.id}` ? 'Loading Private Proof…' : 'View Private Proof'}</button></div>
                  ))}</div>}
                </div>
              )}

              {section === 'expenses' && (
                <div>
                  <div className="mb-5"><div className="text-xs font-mono font-bold uppercase tracking-widest text-orange-600">Approval Queue</div><h2 className="mt-1 text-2xl font-black text-stone-900">Pending Expenses</h2></div>
                  {expenses.length === 0 ? <QueueEmpty>No expenses are awaiting approval.</QueueEmpty> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{expenses.map((expense) => (
                    <div key={expense.id} className="rounded border border-stone-200 bg-white p-5 shadow-xs"><div className="flex justify-between gap-3"><div><div className="text-xl font-black text-stone-900">{formatMoney(expense.amount, expense.currency)}</div><div className="mt-1 text-xs text-stone-500">Submitted {formatDate(expense.created_at)}</div></div><span className="h-fit rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900">{expense.status}</span></div><p className="mt-4 text-sm text-stone-700 line-clamp-3">{expense.description}</p><button type="button" onClick={() => void viewPrivateImage('expense', expense.id, `Expense receipt · ${formatMoney(expense.amount, expense.currency)}`)} disabled={imageLoadingKey !== null} className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-stone-300 text-xs font-bold text-stone-800 hover:border-orange-400 disabled:text-stone-400"><FileCheck2 className="w-4 h-4" />{imageLoadingKey === `expense:${expense.id}` ? 'Loading Private Receipt…' : 'View Private Receipt'}</button></div>
                  ))}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {review && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="admin-report-review-title">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded border border-stone-300 bg-white shadow-2xl">
            <button type="button" onClick={() => { setReview(null); setReviewError(null); setReportPhoto(null); setReportPhotoError(null); setReportPhotoMissing(false); }} className="absolute top-4 right-4 p-2 rounded text-stone-400 hover:bg-stone-100 hover:text-stone-900" aria-label="Close report review"><X className="w-5 h-5" /></button>
            <div className="p-6 sm:p-8">
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-orange-600">Submitted Report</div>
              <h2 id="admin-report-review-title" className="mt-2 pr-10 text-2xl font-black text-stone-900">{review.report.tracking_id}</h2>
              <div className="mt-3 flex flex-wrap gap-2"><span className="rounded border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-900">{review.report.status}</span><span className="rounded border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-bold text-stone-700">{review.report.category ?? 'Uncategorized'}</span></div>
              <div className="mt-5 rounded border border-stone-200 bg-stone-50 p-4"><div className="text-[11px] font-mono font-bold uppercase text-stone-500">Description</div><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{review.report.description}</p></div>

              <div className="mt-6 rounded border border-stone-200 bg-white p-4 sm:p-5">
                <div className="flex items-center gap-2"><Image className="w-4 h-4 text-orange-600" /><h3 className="text-sm font-black text-stone-900">Submitted Problem Photo</h3></div>
                <p className="mt-1 text-xs text-stone-500">Loaded privately with your authenticated Admin session. No public media URL is created.</p>
                {reportPhotoLoading ? (
                  <div className="mt-4 h-48 rounded border border-stone-200 bg-stone-100 animate-pulse flex items-center justify-center text-xs text-stone-500">Loading submitted photo…</div>
                ) : reportPhotoError ? (
                  <div role="alert" className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-xs text-red-900">{reportPhotoError}</div>
                ) : reportPhotoMissing ? (
                  <div className="mt-4 rounded border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-xs text-stone-500">No submitted problem photo is available for this report.</div>
                ) : reportPhoto?.reportId === review.report.id ? (
                  <div className="mt-4 rounded border border-stone-200 bg-stone-100 p-2"><img src={reportPhoto.url} alt="Submitted problem" className="mx-auto max-h-[50vh] object-contain" /></div>
                ) : null}
              </div>

              <div className="mt-6 rounded border border-violet-200 bg-violet-50 p-5">
                <div className="flex items-start gap-3"><Bot className="w-5 h-5 text-violet-700 shrink-0" /><div><div className="text-sm font-black text-violet-950">AI Triage · Advisory Only</div><p className="mt-1 text-xs text-violet-800">AI output does not approve, reject, or merge reports. An administrator must make every decision.</p></div></div>
                {review.ai_triage ? <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">{Object.entries(review.ai_triage.result).map(([key, value]) => <div key={key} className="rounded border border-violet-200 bg-white/70 p-3"><dt className="text-[11px] font-mono font-bold uppercase text-violet-700">{key.replaceAll('_', ' ')}</dt><dd className="mt-1 text-sm text-stone-800 whitespace-pre-wrap">{value}</dd></div>)}</dl> : <div className="mt-4 text-sm text-violet-800">No AI triage result is available.</div>}
              </div>

              <div className="mt-6"><h3 className="text-lg font-black text-stone-900">Possible Duplicate Candidates</h3><p className="mt-1 text-xs text-stone-500">Review each candidate. Nothing is merged automatically.</p>
                {review.duplicate_candidates.length === 0 ? <div className="mt-3 rounded border border-dashed border-stone-300 p-5 text-sm text-stone-500">No duplicate candidates were returned.</div> : <div className="mt-3 space-y-3">{review.duplicate_candidates.map((candidate) => (
                  <div key={candidate.id} className="rounded border border-stone-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><div className="font-mono text-xs font-bold text-stone-900">{candidate.candidate_report.tracking_id}</div><div className="mt-1 text-sm font-bold text-stone-800">{candidate.candidate_report.category ?? 'Uncategorized'} · {candidate.candidate_report.status}</div><div className="mt-1 text-xs text-stone-500">{Math.round(candidate.distance_meters)} metres away · Candidate status: {candidate.status}</div></div><button type="button" onClick={() => void mergeReport(candidate.candidate_report)} disabled={mutationKey !== null} className="px-4 py-2 rounded border border-amber-300 bg-amber-50 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:text-stone-400">Merge Into This Report</button></div>
                ))}</div>}
              </div>

              {reviewError && <div role="alert" className="mt-5 p-4 rounded border border-red-200 bg-red-50 text-sm text-red-900">{reviewError}</div>}
              <div className="mt-7 pt-5 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div className="flex items-center gap-2 text-xs text-stone-500"><ShieldCheck className="w-4 h-4 text-emerald-600" />Coordinates and internal ownership fields are withheld.</div><div className="flex gap-2"><button type="button" onClick={() => void decideReport('Rejected')} disabled={mutationKey !== null} className="inline-flex items-center gap-2 px-4 py-2 rounded border border-red-200 bg-red-50 text-xs font-bold text-red-700 disabled:text-stone-400"><XCircle className="w-4 h-4" />Reject</button><button type="button" onClick={() => void decideReport('Approved')} disabled={mutationKey !== null} className="inline-flex items-center gap-2 px-4 py-2 rounded bg-emerald-700 text-xs font-bold text-white disabled:bg-stone-400">{mutationKey ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Approve</button></div></div>
            </div>
          </div>
        </div>
      )}

      {privateImage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="private-image-title">
          <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded border border-stone-300 bg-white shadow-2xl">
            <button type="button" onClick={() => setPrivateImage(null)} className="absolute top-4 right-4 z-10 p-2 rounded bg-white/90 text-stone-600 hover:text-stone-900" aria-label="Close private image"><X className="w-5 h-5" /></button>
            <div className="p-6"><div className="text-xs font-mono font-bold uppercase tracking-widest text-orange-600">Authenticated Private Media</div><h2 id="private-image-title" className="mt-2 pr-10 text-xl font-black text-stone-900">{privateImage.title}</h2><p className="mt-1 text-xs text-stone-500">This temporary image is loaded with your Admin token and is not published as a public URL.</p>
              <div className="mt-5 rounded border border-stone-200 bg-stone-100 p-2"><img src={privateImage.url} alt={privateImage.kind === 'donation' ? 'Private donation proof' : 'Private expense receipt'} className="mx-auto max-h-[55vh] object-contain" /></div>
              <div className="mt-5 flex flex-col sm:flex-row justify-end gap-2"><button type="button" onClick={() => privateImage.kind === 'donation' ? void reviewDonation(privateImage.id, 'Rejected') : void reviewExpense(privateImage.id, 'Rejected')} disabled={mutationKey !== null} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-red-200 bg-red-50 text-xs font-bold text-red-700 disabled:text-stone-400"><XCircle className="w-4 h-4" />Rejected</button><button type="button" onClick={() => privateImage.kind === 'donation' ? void reviewDonation(privateImage.id, 'Verified') : void reviewExpense(privateImage.id, 'Approved')} disabled={mutationKey !== null} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-emerald-700 text-xs font-bold text-white disabled:bg-stone-400">{mutationKey ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}{privateImage.kind === 'donation' ? 'Verified' : 'Approved'}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
