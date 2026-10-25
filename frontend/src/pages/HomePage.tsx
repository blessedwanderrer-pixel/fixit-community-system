import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Camera, FileText, MapPin, Search, UserPlus } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ASSETS, responsiveImageProps } from '../constants/assets';
import { useI18n } from '../i18n/I18nContext';
import { HeroCursorHeadline } from '../components/home/HeroCursorHeadline';

const steps = [
  { icon: Camera, title: 'Show the problem', text: 'Add one clear photo.' },
  { icon: MapPin, title: 'Pin the location', text: 'Tell us exactly where it is.' },
  { icon: FileText, title: 'Follow the response', text: 'Use your ID to see each update.' },
];

export const HomePage: React.FC = () => {
  const [trackingId, setTrackingId] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, t } = useI18n();
  const startPath = user ? '/report' : '/signup';
  const isArabicScript = language !== 'en';

  const submitTracking = (event: React.FormEvent) => {
    event.preventDefault();
    const id = trackingId.trim();
    if (id) navigate(`/track?id=${encodeURIComponent(id)}`);
  };

  return (
    <div className="bg-[#fffdf8]">
      <section className="overflow-hidden border-b border-stone-200">
        <div dir="ltr" className="mx-auto grid max-w-[1440px] lg:min-h-[610px] lg:grid-cols-[60%_40%]">
          <div dir={isArabicScript ? 'rtl' : 'ltr'} className="flex flex-col justify-center px-5 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
            <p className={`mb-5 text-xs font-bold text-orange-600 ${isArabicScript ? 'tracking-normal' : 'uppercase tracking-[0.22em]'}`}>{t('Report · Follow up · See action')}</p>
            <HeroCursorHeadline />
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-stone-600 sm:text-xl">
              {t('Send the location and a photo. FixIt gives you a tracking ID so you can follow every update.')}
            </p>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link to={startPath} className="fixit-button-primary min-h-14 px-6 text-base">
                <UserPlus className="h-5 w-5" />
                {t('Report a problem')}
                <ArrowRight className="h-5 w-5 rtl:rotate-180" />
              </Link>
              {!user ? <Link to="/login" className="text-sm font-bold text-stone-700 underline decoration-stone-300 underline-offset-4 hover:text-orange-600">{t('Sign in to continue')}</Link> : null}
            </div>
            <form onSubmit={submitTracking} className="mt-9 w-full overflow-hidden rounded-xl bg-stone-950 p-4 text-white sm:hidden">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-stone-400">{t('Already reported?')}</p><h2 className="mt-0.5 text-xl font-semibold">{t('Find your')} <span className={`${isArabicScript ? '' : 'font-editorial-accent'} text-2xl text-orange-400`}>{t('report.')}</span></h2></div>
                <Search className="mb-1 h-5 w-5 text-orange-400" aria-hidden="true" />
              </div>
              <label htmlFor="home-tracking-id-mobile" className="sr-only">{t('Tracking ID')}</label>
              <div className="flex gap-2">
                <input id="home-tracking-id-mobile" value={trackingId} onChange={(event) => setTrackingId(event.target.value)} placeholder={t('Tracking ID')} autoComplete="off" dir="ltr" className="min-h-12 min-w-0 flex-1 rounded-lg border border-stone-700 bg-stone-900 px-3 font-mono text-sm text-white outline-none placeholder:text-stone-500" />
                <button type="submit" disabled={!trackingId.trim()} className="grid min-h-12 w-12 shrink-0 place-items-center rounded-lg bg-orange-600 text-white disabled:opacity-40" aria-label={t('Check report status')}><ArrowRight className="h-5 w-5 rtl:rotate-180" /></button>
              </div>
            </form>
          </div>

          <div dir="ltr" className="relative min-h-[220px] overflow-hidden sm:min-h-[330px] lg:min-h-full">
            <img {...responsiveImageProps(ASSETS.projectRoadRepair, '(min-width: 1024px) 50vw, 100vw')} alt={t('FixIt road repair team working in a local community')} className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#fffdf8] via-[#fffdf8]/10 to-transparent lg:block" aria-hidden="true" />
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#fffdf8] to-transparent lg:hidden" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="relative z-10 hidden -mt-1 px-5 sm:-mt-9 sm:block sm:px-8" aria-labelledby="tracking-title">
        <form onSubmit={submitTracking} className="mx-auto grid max-w-7xl overflow-hidden rounded-2xl bg-stone-950 text-white shadow-[0_24px_70px_-32px_rgba(0,0,0,.7)] md:grid-cols-[.8fr_1.2fr]">
          <div className="relative border-b border-stone-800 px-6 py-6 md:border-b-0 md:border-r md:px-8 md:py-7">
            <span className="absolute inset-y-0 left-0 w-1.5 bg-orange-500" aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-[.2em] text-stone-400">{t('Already reported?')}</p>
            <h2 id="tracking-title" className="mt-1 text-3xl font-semibold tracking-tight">{t('Find your')} <span className={`${isArabicScript ? '' : 'font-editorial-accent'} text-4xl text-orange-400`}>{t('report.')}</span></h2>
          </div>
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
            <label htmlFor="home-tracking-id" className="sr-only">{t('Tracking ID')}</label>
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-400" aria-hidden="true" />
              <input id="home-tracking-id" value={trackingId} onChange={(event) => setTrackingId(event.target.value)} placeholder={t('Enter tracking ID')} autoComplete="off" dir="ltr" className="min-h-13 w-full rounded-lg border border-stone-700 bg-stone-900 pl-11 pr-4 font-mono text-sm text-white outline-none placeholder:text-stone-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <button type="submit" disabled={!trackingId.trim()} className="fixit-button-primary min-h-13 justify-center px-6 disabled:cursor-not-allowed disabled:opacity-45">{t('Check status')} <ArrowRight className="h-4 w-4 rtl:rotate-180" /></button>
          </div>
        </form>
      </section>

      <section className="border-b border-stone-200 bg-white py-12 sm:pb-14 sm:pt-20" aria-labelledby="simple-process-title">
        <h2 id="simple-process-title" className="sr-only">{t('How to report a problem')}</h2>
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 md:grid-cols-3 lg:px-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="flex items-center gap-4 md:border-r md:border-stone-200 md:last:border-r-0">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-orange-100 text-orange-600"><Icon className="h-6 w-6" /></span>
                <div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">{t('Step')} 0{index + 1}</p><h3 className="mt-1 text-lg font-bold text-stone-950">{t(step.title)}</h3><p className="mt-1 text-sm leading-relaxed text-stone-600">{t(step.text)}</p></div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
};
