import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { FixItLogo } from '../components/brand/FixItLogo';
import { 
  ArrowRight,
  Camera,
  Lock, 
  Info,
  KeyRound,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { roleHomePath } from '../auth/types';
import { useFeedback } from '../ui/FeedbackContext';
import { useI18n } from '../i18n/I18nContext';

export const LoginPage: React.FC = () => {
  const { playFeedback } = useFeedback();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isLoading, error: sessionError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const currentUser = await signIn(email, password);
      const requestedPath = (location.state as { from?: string } | null)?.from;
      const destination = requestedPath && currentUser.role === 'citizen'
        ? requestedPath
        : roleHomePath[currentUser.role];
      playFeedback('success');
      navigate(destination, { replace: true });
    } catch (cause) {
      setLoginError(cause instanceof Error ? cause.message : 'Authentication failed.');
      playFeedback('error');
    }
  };
  const visibleError = loginError ?? sessionError;
  const passwordResetComplete = Boolean((location.state as { passwordReset?: boolean } | null)?.passwordReset);
  const emailConfirmed = new URLSearchParams(location.search).get('email-confirmed') === 'true';

  return (
    <main className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-[#f5f1e8] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(to_right,rgba(41,37,36,.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(41,37,36,.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-orange-500/15 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-stone-300/80 bg-white shadow-[0_30px_90px_rgba(41,37,36,0.14)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative overflow-hidden bg-[#ff4b0b] p-7 text-white sm:p-10 lg:flex lg:min-h-[680px] lg:flex-col lg:justify-between lg:p-12">
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full border-[52px] border-white/10" />
          <div className="pointer-events-none absolute right-10 top-16 h-32 w-32 rotate-12 rounded-[2rem] border border-white/20" />

          <div className="relative z-10">
            <div className="inline-flex rounded-2xl bg-[#f5f1e8] px-4 py-3 shadow-sm">
              <FixItLogo size="lg" variant="light" />
            </div>
            <p className="mt-10 text-xs font-black uppercase tracking-[0.22em] text-white/70">{t('Citizen access')}</p>
            <h1 className="mt-3 max-w-md text-4xl font-black leading-[0.95] tracking-[-0.04em] sm:text-5xl">
              {t('Your street.')}<br />{t('Your report.')}<br /><span className="text-stone-950">{t('Your impact.')}</span>
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
              {t('Sign in to report a local problem, follow its progress, and see what changes in your community.')}
            </p>
          </div>

          <div className="relative z-10 mt-10 grid grid-cols-3 gap-3 lg:mt-16">
            {[
              { icon: Camera, label: t('Report') },
              { icon: MapPin, label: t('Locate') },
              { icon: ShieldCheck, label: t('Track') },
            ].map(({ icon: Icon, label }, index) => (
              <div key={label} className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm sm:p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-950 text-white"><Icon className="h-4 w-4" /></div>
                <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-white/60">0{index + 1}</div>
                <div className="mt-0.5 text-sm font-black">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center px-6 py-10 sm:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-orange-800">
              <ShieldCheck className="h-3.5 w-3.5" /> {t('Secure account access')}
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-[-0.035em] text-stone-950 sm:text-4xl">{t('Welcome back.')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">{t('Enter your account details to continue to FixIt.')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="pt-5">
              <label htmlFor="login-email" className="mb-2 block text-xs font-bold text-stone-700">
                {t('Email Address')}
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="account@example.com"
                dir="ltr"
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3.5 text-sm outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-4">
                <label htmlFor="login-password" className="block text-xs font-bold text-stone-700">{t('Password')}</label>
                <Link to="/forgot-password" className="text-xs font-bold text-orange-700 hover:text-orange-600 hover:underline">{t('Forgot password?')}</Link>
              </div>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                dir="ltr"
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3.5 text-sm outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
              />
            </div>

            <div className="flex items-center text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-stone-400" />
                {t('TLS Encrypted')}
              </span>
            </div>

            {visibleError && (
              <div role="alert" className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <span>{visibleError}</span>
              </div>
            )}

            {passwordResetComplete && !visibleError && (
              <div role="status" className="p-3 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                {t('Your password was updated successfully. Sign in with your new password.')}
              </div>
            )}

            {emailConfirmed && !visibleError && (
              <div role="status" className="p-3 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                {t('Your email is confirmed. Sign in to continue.')}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-stone-950/10 transition hover:bg-orange-600 disabled:cursor-wait disabled:bg-stone-400"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isLoading ? t('Signing you in…') : t('Sign in securely')}</span>
              {!isLoading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
            </button>
          </form>

          <div className="mt-7 border-t border-stone-200 pt-5 text-center">
            <p className="text-sm font-semibold text-stone-800">
              {t('New to FixIt?')}{' '}
              <Link to="/signup" className="text-orange-600 hover:text-orange-500 hover:underline">
                {t('Create a free account')}
              </Link>
            </p>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-stone-500"><Lock className="h-3 w-3" /> {t('Your account and reports are protected.')}</p>
          </div>
          </div>
        </section>
      </div>
    </main>
  );
};
