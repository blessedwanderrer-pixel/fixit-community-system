import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  ChevronRight,
  FileText,
  Hash,
  RefreshCw,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { PageHero } from '../components/common/PageHero';
import { apiRequest } from '../lib/api';

type ReportStatus =
  | 'Submitted'
  | 'Approved'
  | 'Rejected'
  | 'Scheduled'
  | 'In Progress'
  | 'Solved'
  | 'Cancelled';

interface CitizenReport {
  id: string;
  tracking_id: string;
  description: string;
  category: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
  possible_duplicate: boolean;
  duplicate_candidate_count: number;
  can_cancel: boolean;
}

interface CitizenNotification {
  id: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const statusClasses: Record<ReportStatus, string> = {
  Submitted: 'bg-sky-50 text-sky-800 border-sky-200',
  Approved: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  Rejected: 'bg-red-50 text-red-800 border-red-200',
  Scheduled: 'bg-purple-50 text-purple-800 border-purple-200',
  'In Progress': 'bg-amber-50 text-amber-900 border-amber-300',
  Solved: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  Cancelled: 'bg-stone-100 text-stone-700 border-stone-300',
};

const DashboardLoading: React.FC = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" aria-label="Loading Citizen dashboard">
    {[0, 1, 2].map((item) => (
      <div key={item} className="h-44 rounded border border-stone-200 bg-white animate-pulse" />
    ))}
  </div>
);

export const CitizenDashboardPage: React.FC = () => {
  const { user, session } = useAuth();
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [notifications, setNotifications] = useState<CitizenNotification[]>([]);
  const [selectedReport, setSelectedReport] = useState<CitizenReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!session?.access_token) {
      setError('Your authenticated session is unavailable. Please sign in again.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [reportRows, notificationRows] = await Promise.all([
        apiRequest<CitizenReport[]>('/api/reports', { accessToken: session.access_token }),
        apiRequest<CitizenNotification[]>('/api/notifications', { accessToken: session.access_token }),
      ]);
      setReports(reportRows);
      setNotifications(notificationRows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your Citizen dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const openReport = async (reportId: string) => {
    if (!session?.access_token || isDetailLoading) return;
    setIsDetailLoading(true);
    setDetailError(null);
    try {
      const report = await apiRequest<CitizenReport>(`/api/reports/${reportId}`, {
        accessToken: session.access_token,
      });
      setSelectedReport(report);
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : 'Unable to open this report.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const cancelReport = async () => {
    if (!selectedReport || !session?.access_token || cancellingId) return;
    if (!selectedReport.can_cancel) return;
    if (!window.confirm(`Cancel report ${selectedReport.tracking_id}? This action cannot be undone.`)) return;

    setCancellingId(selectedReport.id);
    setDetailError(null);
    try {
      const cancelled = await apiRequest<CitizenReport>(`/api/reports/${selectedReport.id}/cancel`, {
        method: 'POST',
        accessToken: session.access_token,
      });
      setSelectedReport(cancelled);
      setReports((current) => current.map((report) => report.id === cancelled.id ? cancelled : report));
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : 'Unable to cancel this report.');
    } finally {
      setCancellingId(null);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    if (!session?.access_token || readingId) return;
    setReadingId(notificationId);
    setError(null);
    try {
      const updated = await apiRequest<CitizenNotification>(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        accessToken: session.access_token,
      });
      setNotifications((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to mark the notification as read.');
    } finally {
      setReadingId(null);
    }
  };

  const canCancelSelected = selectedReport?.can_cancel ?? false;
  const unreadCount = notifications.reduce((count, item) => count + (item.read_at ? 0 : 1), 0);

  return (
    <div className="w-full">
      <PageHero
        kicker="Citizen Account"
        title="Citizen Dashboard"
        subtitle="Review your submitted community reports and authenticated FixIt notifications."
        breadcrumbs={[{ label: 'Citizen Dashboard' }]}
        badgeText="Backend-Verified Citizen Session"
        actionPrimary={{ label: 'Report a Problem', href: '/report' }}
        actionSecondary={{ label: 'Submit Donation Proof', href: '/submit-donation-proof' }}
      />

      <section className="py-12 sm:py-16 bg-stone-50 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded border border-stone-200 bg-white p-5 sm:p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500">Authenticated Citizen</div>
                <div className="text-sm font-bold text-stone-900 truncate">{user?.email ?? 'Email unavailable'}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded border border-stone-200 text-xs font-bold text-stone-700 hover:border-orange-400 disabled:text-stone-400 disabled:cursor-wait"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Dashboard
            </button>
          </div>

          {error && (
            <div role="alert" className="mb-8 p-4 rounded border border-red-200 bg-red-50 text-sm text-red-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <DashboardLoading />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
              <div className="xl:col-span-2 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono font-bold uppercase tracking-widest text-orange-600">Your Cases</div>
                    <h2 className="mt-1 text-2xl font-black text-stone-900">Community Reports</h2>
                  </div>
                  <div className="flex gap-2">
                    <Link to="/report" className="px-4 py-2 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold">Report a Problem</Link>
                    <Link to="/submit-donation-proof" className="px-4 py-2 rounded border border-stone-300 bg-white text-stone-800 text-xs font-bold">Submit Donation Proof</Link>
                  </div>
                </div>

                {reports.length === 0 ? (
                  <div className="rounded border border-dashed border-stone-300 bg-white p-10 text-center">
                    <FileText className="w-8 h-8 text-stone-400 mx-auto" />
                    <h3 className="mt-3 text-lg font-bold text-stone-900">No reports submitted</h3>
                    <p className="mt-1 text-sm text-stone-600">Your authenticated community reports will appear here.</p>
                    <Link to="/report" className="mt-5 inline-flex px-5 py-2.5 rounded bg-orange-600 text-white text-xs font-bold">Report a Problem</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.map((report) => (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => void openReport(report.id)}
                        disabled={isDetailLoading}
                        className="w-full rounded border border-stone-200 bg-white p-5 text-left hover:border-orange-300 disabled:cursor-wait transition-colors shadow-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs font-mono font-bold text-stone-900">
                              <Hash className="w-3.5 h-3.5 text-orange-600" />
                              {report.tracking_id}
                            </div>
                            <div className="mt-2 text-sm font-bold text-stone-900">{report.category ?? 'Uncategorized'}</div>
                            <div className="mt-1 text-xs text-stone-500 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              Created {formatDate(report.created_at)}
                            </div>
                            {report.possible_duplicate && (
                              <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded px-2.5 py-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Possible duplicate under Admin review
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`inline-flex rounded border px-2.5 py-1 text-xs font-bold ${statusClasses[report.status]}`}>{report.status}</span>
                            <ChevronRight className="w-4 h-4 text-stone-400" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {detailError && !selectedReport && (
                  <div role="alert" className="p-4 rounded border border-red-200 bg-red-50 text-sm text-red-900">{detailError}</div>
                )}
              </div>

              <aside className="rounded border border-stone-200 bg-white shadow-xs overflow-hidden">
                <div className="p-5 border-b border-stone-200 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-orange-600" />
                      <h2 className="text-lg font-black text-stone-900">Notifications</h2>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">{unreadCount} unread</p>
                  </div>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-stone-500">No notifications yet.</div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {notifications.map((notification) => (
                      <div key={notification.id} className={`p-5 ${notification.read_at ? 'bg-white' : 'bg-orange-50/50'}`}>
                        <div className="flex items-start gap-3">
                          <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${notification.read_at ? 'bg-stone-300' : 'bg-orange-600'}`} />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-stone-900">{notification.title}</h3>
                            <p className="mt-1 text-xs text-stone-600 leading-relaxed">{notification.body}</p>
                            <div className="mt-2 text-[11px] text-stone-400">{formatDate(notification.created_at)}</div>
                            {!notification.read_at && (
                              <button
                                type="button"
                                onClick={() => void markNotificationRead(notification.id)}
                                disabled={readingId !== null}
                                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 hover:text-orange-800 disabled:text-stone-400"
                              >
                                <Check className="w-3.5 h-3.5" />
                                {readingId === notification.id ? 'Marking Read…' : 'Mark as Read'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          )}
        </div>
      </section>

      {selectedReport && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="report-detail-title">
          <div className="relative w-full max-w-2xl rounded border border-stone-300 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setSelectedReport(null);
                setDetailError(null);
              }}
              className="absolute top-4 right-4 p-2 rounded text-stone-400 hover:text-stone-800 hover:bg-stone-100"
              aria-label="Close report details"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6 sm:p-8">
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-orange-600">Citizen Report Detail</div>
              <h2 id="report-detail-title" className="mt-2 pr-10 text-2xl font-black text-stone-900">{selectedReport.tracking_id}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded border px-2.5 py-1 text-xs font-bold ${statusClasses[selectedReport.status]}`}>{selectedReport.status}</span>
                {selectedReport.possible_duplicate && (
                  <span className="inline-flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5" /> Possible Duplicate
                  </span>
                )}
              </div>

              <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded bg-stone-50 border border-stone-200 p-4">
                  <dt className="text-[11px] font-mono font-bold uppercase text-stone-500">Category</dt>
                  <dd className="mt-1 text-sm font-bold text-stone-900">{selectedReport.category ?? 'Uncategorized'}</dd>
                </div>
                <div className="rounded bg-stone-50 border border-stone-200 p-4">
                  <dt className="text-[11px] font-mono font-bold uppercase text-stone-500">Created</dt>
                  <dd className="mt-1 text-sm font-bold text-stone-900">{formatDate(selectedReport.created_at)}</dd>
                </div>
              </dl>

              <div className="mt-4 rounded bg-stone-50 border border-stone-200 p-4">
                <div className="text-[11px] font-mono font-bold uppercase text-stone-500">Description</div>
                <p className="mt-2 text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{selectedReport.description}</p>
              </div>

              {detailError && (
                <div role="alert" className="mt-4 p-3 rounded border border-red-200 bg-red-50 text-xs text-red-900">{detailError}</div>
              )}

              <div className="mt-6 pt-5 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-xs text-stone-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Private coordinates and internal fields are not displayed.
                </div>
                {canCancelSelected && (
                  <button
                    type="button"
                    onClick={() => void cancelReport()}
                    disabled={cancellingId !== null}
                    className="px-4 py-2 rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:text-stone-400 text-xs font-bold"
                  >
                    {cancellingId ? 'Cancelling…' : 'Cancel Submitted Report'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
