import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { roleHomePath } from '../../auth/types';
import { FixItLogo } from '../brand/FixItLogo';
import { ArrowUpRight, CalendarClock, Users } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

export const Footer: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <footer className="border-t border-stone-200 bg-[#fffdf8]">
      <div className="mx-auto max-w-7xl px-5 pt-10 sm:px-8">
        <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-orange-600">{t('Explore more of FixIt')}</p>
        <div className="grid overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_18px_55px_-38px_rgba(28,25,23,.55)] md:grid-cols-2">
          <Link to="/about" className="group relative flex min-h-40 items-start gap-5 p-6 transition-colors hover:bg-orange-50 sm:p-8 md:border-r md:border-stone-200">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-stone-950 text-white"><Users className="h-5 w-5" /></span>
            <span>
              <span className="flex items-center gap-2 text-xl font-black text-stone-950">{t('About FixIt')}<ArrowUpRight className="h-5 w-5 text-orange-600 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" /></span>
              <span className="mt-2 block max-w-md text-sm leading-relaxed text-stone-600">{t('Learn why FixIt exists and how community action became a public service.')}</span>
            </span>
          </Link>
          <Link to="/upcoming-work" className="group relative flex min-h-40 items-start gap-5 border-t border-stone-200 bg-orange-600 p-6 text-white transition-colors hover:bg-orange-500 sm:p-8 md:border-t-0">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-orange-600"><CalendarClock className="h-5 w-5" /></span>
            <span>
              <span className="flex items-center gap-2 text-xl font-black">{t('Upcoming Work')}<ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" /></span>
              <span className="mt-2 block max-w-md text-sm leading-relaxed text-white/85">{t('See scheduled community work before it begins.')}</span>
            </span>
          </Link>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-md">
          <FixItLogo size="sm" variant="light" />
          <p className="mt-3 text-sm leading-relaxed text-stone-600">A simple place for citizens to report community problems and follow the fix.</p>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-bold text-stone-700">
          {user ? <Link to={roleHomePath[user.role]} className="hover:text-orange-600">My Area</Link> : <Link to="/signup" className="hover:text-orange-600">Create Account</Link>}
          <Link to="/faq" className="hover:text-orange-600">Help</Link>
          <Link to="/contact" className="hover:text-orange-600">Contact</Link>
        </nav>
      </div>
      <div className="border-t border-stone-200 bg-stone-950 px-5 py-4 text-center text-xs text-stone-400">
        © {new Date().getFullYear()} FixIt Pakistan. Built for clear citizen action.
      </div>
    </footer>
  );
};
