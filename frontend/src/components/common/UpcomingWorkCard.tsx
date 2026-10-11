import React from 'react';
import { CalendarClock, ClipboardList, ShieldCheck } from 'lucide-react';

export interface UpcomingWorkItem {
  tracking_id: string;
  title: string;
  category: string | null;
  status: string;
  scheduled_for: string;
  work_details: string | null;
}

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'full', timeStyle: 'short',
}).format(new Date(value));

export const UpcomingWorkCard: React.FC<{ item: UpcomingWorkItem }> = ({ item }) => (
  <article className="civic-card rounded-lg border border-stone-200 bg-white p-5 sm:p-6 hover:border-orange-300 transition-colors flex flex-col">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs font-mono font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-1 rounded">{item.tracking_id}</span><h3 className="mt-3 text-lg font-black text-stone-900">{item.title}</h3>{item.category && item.title === item.category ? null : <p className="mt-1 text-xs font-semibold text-stone-500">Scheduled community operation</p>}</div><span className="rounded border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-900">{item.status}</span></div>
    <div className="mt-5 rounded border border-stone-200 bg-stone-50 p-4"><div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase text-stone-500"><CalendarClock className="w-4 h-4 text-orange-600" />Scheduled For</div><div className="mt-2 text-sm font-bold text-stone-900">{formatDate(item.scheduled_for)}</div></div>
    <div className="mt-4 flex-1"><div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase text-stone-500"><ClipboardList className="w-4 h-4 text-orange-600" />Work Details</div><p className="mt-2 text-sm leading-relaxed text-stone-700 whitespace-pre-wrap">{item.work_details ?? 'No additional work details provided.'}</p></div>
    <div className="mt-5 pt-4 border-t border-stone-100 flex items-center gap-1.5 text-[11px] text-stone-500"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />No exact location or private report data is displayed.</div>
  </article>
);
