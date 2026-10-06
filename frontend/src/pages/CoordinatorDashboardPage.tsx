import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardList,
  FileImage,
  HandCoins,
  LoaderCircle,
  Play,
  RefreshCw,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { PageHero } from '../components/common/PageHero';
import { apiRequest } from '../lib/api';

type ReportStatus = 'Submitted' | 'Approved' | 'Rejected' | 'Scheduled' | 'In Progress' | 'Solved' | 'Cancelled';
type EvidenceStage = 'before' | 'after';

interface CoordinatorReport {
  id: string;
  tracking_id: string;
  description: string;
  category: string | null;
  status: ReportStatus;
  created_at: string;
  assigned_to_current_user: boolean;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  work_details: string | null;
  evidence_stages: EvidenceStage[];
}

interface Expense {
  id: string;
  report_id: string;
  amount: string | number;
  currency: string;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
}

const acceptedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const imageAccept = 'image/jpeg,image/png,image/webp';

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

const errorMessage = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;

const statusClasses: Record<ReportStatus, string> = {
  Submitted: 'border-sky-200 bg-sky-50 text-sky-900',
  Approved: 'border-indigo-200 bg-indigo-50 text-indigo-900',
  Rejected: 'border-red-200 bg-red-50 text-red-800',
  Scheduled: 'border-purple-200 bg-purple-50 text-purple-900',
  'In Progress': 'border-amber-300 bg-amber-50 text-amber-900',
  Solved: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  Cancelled: 'border-stone-300 bg-stone-100 text-stone-700',
};

const EmptyQueue: React.FC = () => (
  <div className="rounded border border-dashed border-stone-300 bg-white p-10 text-center">
    <ClipboardList className="w-9 h-9 mx-auto text-stone-400" />
    <h2 className="mt-3 text-lg font-black text-stone-900">No work is currently available</h2>
    <p className="mt-1 text-sm text-stone-500">Approved and assigned reports will appear here.</p>
  </div>
);

export const CoordinatorDashboardPage: React.FC = () => {
  const { session, user } = useAuth();
  const [reports, setReports] = useState<CoordinatorReport[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mutation, setMutation] = useState<string | null>(null);
  const [scheduledFor, setScheduledFor] = useState('');
  const [scheduleDetails, setScheduleDetails] = useState('');
  const [progressDetails, setProgressDetails] = useState('');
  const [evidenceStage, setEvidenceStage] = useState<EvidenceStage>('before');
  const [evidencePhoto, setEvidencePhoto] = useState<File | null>(null);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseReceipt, setExpenseReceipt] = useState<File | null>(null);

  const accessToken = session?.access_token;
  const selectedReport = reports.find((report) => report.id === selectedId) ?? null;

  const loadReports = useCallback(async (showLoader = true) => {
    if (!accessToken) {
      setError('Your authenticated session is unavailable. Please sign in again.');
      setLoading(false);
      return;
    }
    if (showLoader) setLoading(true);
    setError(null);
    try {
      setReports(await apiRequest<CoordinatorReport[]>('/api/coordinator/reports', { accessToken }));
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to load the Coordinator work queue.'));
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { void loadReports(); }, [loadReports]);

  useEffect(() => {
    if (!selectedReport || !user) return;
    setScheduleDetails(selectedReport.work_details ?? '');
    setProgressDetails('');
    setScheduledFor('');
    setEvidenceStage('before');
    setEvidencePhoto(null);
    setExpenseAmount('');
    setExpenseDescription('');
    setExpenseReceipt(null);
    setActionError(null);
  }, [selectedReport?.id, user]);

  const queueCounts = useMemo(() => ({
    available: reports.filter((report) => report.status === 'Approved').length,
    assigned: reports.filter((report) => report.assigned_to_current_user).length,
    active: reports.filter((report) => report.status === 'Scheduled' || report.status === 'In Progress').length,
  }), [reports]);

  const scheduleReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedReport || !accessToken || mutation || !scheduledFor) return;
    setMutation('schedule');
    setActionError(null);
    setNotice(null);
    try {
      await apiRequest<CoordinatorReport>(`/api/coordinator/reports/${selectedReport.id}/schedule`, {
        method: 'POST', accessToken, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_for: new Date(scheduledFor).toISOString(), work_details: scheduleDetails.trim() || null }),
      });
      await loadReports(false);
      setNotice(`${selectedReport.tracking_id} is now Scheduled.`);
    } catch (cause) {
      setActionError(errorMessage(cause, 'Unable to schedule this report.'));
    } finally {
      setMutation(null);
    }
  };

  const transitionReport = async (status: 'In Progress' | 'Solved') => {
    if (!selectedReport || !accessToken || mutation) return;
    setMutation('status');
    setActionError(null);
    setNotice(null);
    try {
      await apiRequest<CoordinatorReport>(`/api/coordinator/reports/${selectedReport.id}/status`, {
        method: 'POST', accessToken, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, work_details: progressDetails.trim() || null }),
      });
      await loadReports(false);
      setNotice(`${selectedReport.tracking_id} moved to ${status}.`);
      setProgressDetails('');
    } catch (cause) {
      setActionError(errorMessage(cause, `Unable to move this report to ${status}.`));
    } finally {
      setMutation(null);
    }
  };

  const uploadEvidence = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedReport || !accessToken || mutation || !evidencePhoto) return;
    if (!acceptedImageTypes.has(evidencePhoto.type)) {
      setActionError('Evidence must be a JPEG, PNG, or WebP image.');
      return;
    }
    setMutation('evidence');
    setActionError(null);
    setNotice(null);
    const form = new FormData();
    form.append('stage', evidenceStage);
    form.append('photo', evidencePhoto);
    try {
      await apiRequest(`/api/coordinator/reports/${selectedReport.id}/evidence/upload`, {
        method: 'POST', accessToken, body: form,
      });
      await loadReports(false);
      setEvidencePhoto(null);
      setNotice(`${evidenceStage === 'before' ? 'Before' : 'After'} evidence uploaded for ${selectedReport.tracking_id}.`);
    } catch (cause) {
      setActionError(errorMessage(cause, 'Unable to upload work evidence.'));
    } finally {
      setMutation(null);
    }
  };

  const submitExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedReport || !accessToken || mutation || !expenseReceipt) return;
    if (!acceptedImageTypes.has(expenseReceipt.type)) {
      setActionError('The receipt must be a JPEG, PNG, or WebP image.');
      return;
    }
    setMutation('expense');
    setActionError(null);
    setNotice(null);
    const form = new FormData();
    form.append('report_id', selectedReport.id);
    form.append('amount', expenseAmount);
    form.append('description', expenseDescription.trim());
    form.append('currency', 'PKR');
    form.append('receipt', expenseReceipt);
    try {
      const expense = await apiRequest<Expense>('/api/coordinator/expenses', { method: 'POST', accessToken, body: form });
      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseReceipt(null);
      setNotice(`Expense submitted with status ${expense.status} for Admin review.`);
    } catch (cause) {
      setActionError(errorMessage(cause, 'Unable to submit the expense.'));
    } finally {
      setMutation(null);
    }
  };

  const hasBefore = selectedReport?.evidence_stages.includes('before') ?? false;
  const hasAfter = selectedReport?.evidence_stages.includes('after') ?? false;
  const isAssigned = selectedReport?.assigned_to_current_user ?? false;

  return (
    <div className="w-full">
      <PageHero kicker="Field Operations" title="Coordinator Dashboard" subtitle="Schedule approved community work, record field progress and submit evidence and expenses." breadcrumbs={[{ label: 'Coordinator Dashboard' }]} badgeText="Backend-Verified Coordinator Session" />

      <section className="py-12 sm:py-16 bg-stone-50 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded border border-stone-200 bg-white p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div><div className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500">Authenticated Coordinator</div><div className="mt-1 text-sm font-bold text-stone-900">{user?.email ?? 'Coordinator account'}</div></div>
            <button type="button" onClick={() => void loadReports()} disabled={loading} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded border border-stone-200 text-xs font-bold text-stone-700 hover:border-orange-400 disabled:text-stone-400"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh Queue</button>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
            {[['Available', queueCounts.available], ['Assigned', queueCounts.assigned], ['Active', queueCounts.active]].map(([label, value]) => <div key={label} className="rounded border border-stone-200 bg-white p-4 sm:p-5"><div className="text-[10px] sm:text-xs font-mono font-bold uppercase text-stone-500">{label}</div><div className="mt-1 text-xl sm:text-2xl font-black text-stone-900">{value}</div></div>)}
          </div>

          {error && <div role="alert" className="mb-6 p-4 rounded border border-red-200 bg-red-50 text-sm text-red-900 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}
          {notice && <div role="status" className="mb-6 p-4 rounded border border-emerald-200 bg-emerald-50 text-sm text-emerald-900 flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />{notice}</div>}

          <div className="mb-5"><div className="text-xs font-mono font-bold uppercase tracking-widest text-orange-600">Live Backend Queue</div><h2 className="mt-1 text-2xl font-black text-stone-900">Available & Assigned Work</h2></div>
          {loading ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-label="Loading work queue">{[0, 1, 2, 3].map((item) => <div key={item} className="h-48 rounded border border-stone-200 bg-white animate-pulse" />)}</div> : reports.length === 0 ? <EmptyQueue /> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {reports.map((report) => {
                const assignment = report.assigned_to_current_user;
                return <article key={report.id} className="rounded border border-stone-200 bg-white p-5 shadow-xs">
                  <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-mono font-bold text-stone-900">{report.tracking_id}</div><h3 className="mt-2 text-lg font-black text-stone-900">{report.category ?? 'Uncategorized'}</h3></div><span className={`shrink-0 rounded border px-2.5 py-1 text-xs font-bold ${statusClasses[report.status]}`}>{report.status}</span></div>
                  <p className="mt-3 text-sm leading-relaxed text-stone-600 line-clamp-2">{report.description}</p>
                  <div className="mt-4 rounded border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">{assignment ? <><div className="font-bold text-stone-900">Assigned to you</div>{report.scheduled_for && <div className="mt-1">Scheduled for {formatDate(report.scheduled_for)}</div>}{report.work_details && <div className="mt-1">Work details: {report.work_details}</div>}</> : <div className="font-bold text-indigo-800">Available approved report</div>}</div>
                  <button type="button" onClick={() => setSelectedId(report.id)} className="mt-4 w-full px-4 py-2.5 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold">{report.status === 'Approved' ? 'Schedule Work' : 'Manage Work'}</button>
                </article>;
              })}
            </div>
          )}
        </div>
      </section>

      {selectedReport && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="coordinator-work-title">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded border border-stone-300 bg-white shadow-2xl">
            <button type="button" onClick={() => setSelectedId(null)} className="absolute top-4 right-4 z-10 p-2 rounded bg-white text-stone-500 hover:bg-stone-100 hover:text-stone-900" aria-label="Close work details"><X className="w-5 h-5" /></button>
            <div className="p-6 sm:p-8">
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-orange-600">Coordinator Work Item</div><h2 id="coordinator-work-title" className="mt-2 pr-10 text-2xl font-black text-stone-900">{selectedReport.tracking_id}</h2>
              <div className="mt-3 flex flex-wrap gap-2"><span className={`rounded border px-2.5 py-1 text-xs font-bold ${statusClasses[selectedReport.status]}`}>{selectedReport.status}</span><span className="rounded border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-bold text-stone-700">{selectedReport.category ?? 'Uncategorized'}</span></div>
              <div className="mt-5 rounded border border-stone-200 bg-stone-50 p-4"><div className="text-[11px] font-mono font-bold uppercase text-stone-500">Problem description</div><p className="mt-2 text-sm leading-relaxed text-stone-700 whitespace-pre-wrap">{selectedReport.description}</p></div>

              {selectedReport.status === 'Approved' && (
                <form onSubmit={(event) => void scheduleReport(event)} className="mt-6 rounded border border-indigo-200 bg-indigo-50/50 p-5">
                  <div className="flex items-center gap-2"><CalendarClock className="w-5 h-5 text-indigo-700" /><h3 className="text-lg font-black text-stone-900">Schedule Work</h3></div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="text-xs font-bold text-stone-700">Scheduled for<input type="datetime-local" required value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} className="mt-1.5 w-full rounded border border-stone-300 bg-white px-3 py-2.5 text-sm font-normal" /></label><label className="text-xs font-bold text-stone-700">Work details <span className="font-normal text-stone-500">(optional)</span><input type="text" value={scheduleDetails} onChange={(event) => setScheduleDetails(event.target.value)} className="mt-1.5 w-full rounded border border-stone-300 bg-white px-3 py-2.5 text-sm font-normal" /></label></div>
                  <button type="submit" disabled={mutation !== null || !scheduledFor} className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded bg-indigo-700 text-white text-xs font-bold disabled:bg-stone-400">{mutation === 'schedule' && <LoaderCircle className="w-4 h-4 animate-spin" />}Schedule Report</button>
                </form>
              )}

              {isAssigned && (selectedReport.status === 'Scheduled' || selectedReport.status === 'In Progress') && (
                <div className="mt-6 rounded border border-orange-200 bg-orange-50/50 p-5">
                  <div className="flex items-center gap-2"><Wrench className="w-5 h-5 text-orange-700" /><h3 className="text-lg font-black text-stone-900">Progress</h3></div>
                  <label className="block mt-4 text-xs font-bold text-stone-700">Progress details <span className="font-normal text-stone-500">(optional)</span><textarea rows={2} value={progressDetails} onChange={(event) => setProgressDetails(event.target.value)} className="mt-1.5 w-full rounded border border-stone-300 bg-white px-3 py-2.5 text-sm font-normal resize-y" /></label>
                  {selectedReport.status === 'Scheduled' ? <button type="button" onClick={() => void transitionReport('In Progress')} disabled={mutation !== null} className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded bg-orange-600 text-white text-xs font-bold disabled:bg-stone-400"><Play className="w-4 h-4" />Start Work</button> : <button type="button" onClick={() => void transitionReport('Solved')} disabled={mutation !== null || !hasBefore || !hasAfter} className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded bg-emerald-700 text-white text-xs font-bold disabled:bg-stone-400"><CheckCircle2 className="w-4 h-4" />Mark Solved</button>}
                  <div className={`mt-3 text-xs font-semibold ${hasBefore && hasAfter ? 'text-emerald-800' : 'text-amber-900'}`}>{hasBefore && hasAfter ? 'Before and After evidence are present.' : 'Solved requires both Before and After evidence.'}</div>
                </div>
              )}

              {isAssigned && (selectedReport.status === 'Scheduled' || selectedReport.status === 'In Progress') && (
                <form onSubmit={(event) => void uploadEvidence(event)} className="mt-6 rounded border border-stone-200 p-5">
                  <div className="flex items-center gap-2"><Camera className="w-5 h-5 text-orange-600" /><h3 className="text-lg font-black text-stone-900">Before / After Evidence</h3></div><p className="mt-1 text-xs text-stone-500">Upload a real local JPEG, PNG, or WebP image.</p>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="text-xs font-bold text-stone-700">Evidence stage<select value={evidenceStage} onChange={(event) => setEvidenceStage(event.target.value as EvidenceStage)} className="mt-1.5 w-full rounded border border-stone-300 bg-white px-3 py-2.5 text-sm font-normal"><option value="before">Before</option><option value="after">After</option></select></label><label className="text-xs font-bold text-stone-700">Photo<input type="file" required accept={imageAccept} onChange={(event) => setEvidencePhoto(event.target.files?.[0] ?? null)} className="mt-1.5 block w-full text-xs text-stone-600 file:mr-3 file:rounded file:border-0 file:bg-stone-900 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white" /></label></div>
                  <button type="submit" disabled={mutation !== null || !evidencePhoto} className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded bg-stone-900 text-white text-xs font-bold disabled:bg-stone-400">{mutation === 'evidence' ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <FileImage className="w-4 h-4" />}Upload {evidenceStage === 'before' ? 'Before' : 'After'} Evidence</button>
                </form>
              )}

              {isAssigned && (
                <form onSubmit={(event) => void submitExpense(event)} className="mt-6 rounded border border-stone-200 p-5">
                  <div className="flex items-center gap-2"><HandCoins className="w-5 h-5 text-orange-600" /><h3 className="text-lg font-black text-stone-900">Submit Expense</h3></div><p className="mt-1 text-xs text-stone-500">Expenses start as Pending and require separate Admin review. Coordinators cannot approve their own expenses.</p>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="text-xs font-bold text-stone-700">Amount (PKR)<input type="number" min="0.01" step="0.01" required value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} className="mt-1.5 w-full rounded border border-stone-300 px-3 py-2.5 text-sm font-normal" /></label><label className="text-xs font-bold text-stone-700">Receipt image<input type="file" required accept={imageAccept} onChange={(event) => setExpenseReceipt(event.target.files?.[0] ?? null)} className="mt-1.5 block w-full text-xs text-stone-600 file:mr-3 file:rounded file:border-0 file:bg-stone-900 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white" /></label></div>
                  <label className="block mt-4 text-xs font-bold text-stone-700">Description<textarea rows={2} required value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} className="mt-1.5 w-full rounded border border-stone-300 px-3 py-2.5 text-sm font-normal resize-y" /></label>
                  <button type="submit" disabled={mutation !== null || !expenseAmount || !expenseDescription.trim() || !expenseReceipt} className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded bg-orange-600 text-white text-xs font-bold disabled:bg-stone-400">{mutation === 'expense' && <LoaderCircle className="w-4 h-4 animate-spin" />}Submit Pending Expense</button>
                </form>
              )}

              {actionError && <div role="alert" className="mt-5 p-4 rounded border border-red-200 bg-red-50 text-sm text-red-900 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{actionError}</div>}
              <div className="mt-6 pt-5 border-t border-stone-200 flex items-center gap-2 text-xs text-stone-500"><ShieldCheck className="w-4 h-4 text-emerald-600" />Citizen coordinates, ownership and other private/internal fields are not displayed.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
