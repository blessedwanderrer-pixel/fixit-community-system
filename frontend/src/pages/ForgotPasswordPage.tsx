import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Info, KeyRound, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FixItLogo } from '../components/brand/FixItLogo';
import { buildPasswordResetRedirectUrl, requestPasswordReset } from '../auth/passwordRecovery';

const genericSuccess = 'If an account exists for that email, a secure password-reset link has been sent. Check your inbox and spam folder.';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    let redirectTo: string;
    try {
      redirectTo = buildPasswordResetRedirectUrl();
    } catch {
      setError('Password recovery is temporarily unavailable. Please contact FixIt support.');
      setIsSubmitting(false);
      return;
    }
    try {
      await requestPasswordReset(email, undefined, redirectTo);
      setSuccess(true);
    } catch {
      // Never expose whether an account exists. Configuration/network failures
      // use the same non-enumerating response as accepted requests.
      setSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-stone-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 civic-grid-dark opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-block mb-4"><FixItLogo size="lg" variant="dark" /></div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Reset account access</h1>
        <p className="mt-2 text-xs text-stone-400">Request a secure, single-use password reset link.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white rounded border border-stone-200 py-8 px-6 sm:px-10 shadow-2xl">
          {success ? (
            <div aria-live="polite">
              <div className="p-4 rounded bg-emerald-50 border border-emerald-200 text-sm text-emerald-950 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <p>{genericSuccess}</p>
              </div>
              <p className="mt-4 text-xs text-stone-500 leading-relaxed">For security, this message is the same for every email address. Reset links expire and can only be used once.</p>
              <Link to="/login" className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Return to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 rounded bg-stone-50 border border-stone-200 flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-orange-100 text-orange-600 flex items-center justify-center shrink-0"><Mail className="w-4 h-4" /></div>
                <p className="text-xs text-stone-600 leading-relaxed">Enter the email address used for your FixIt account. Citizen, Admin, and Coordinator accounts use the same secure recovery process.</p>
              </div>
              <div>
                <label htmlFor="recovery-email" className="block text-xs font-bold text-stone-700 mb-1">Email Address</label>
                <input id="recovery-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="account@example.com" className="w-full px-3 py-2 text-xs border border-stone-300 rounded focus:outline-none focus:border-orange-500 font-mono" />
              </div>
              {error && <div role="alert" className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2"><Info className="w-4 h-4 shrink-0" />{error}</div>}
              <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 disabled:cursor-wait rounded transition-colors">
                <KeyRound className="w-3.5 h-3.5" /> {isSubmitting ? 'Sending secure link…' : 'Send password-reset link'}
              </button>
              <Link to="/login" className="flex items-center justify-center gap-1 text-xs font-bold text-orange-700 hover:underline"><ArrowLeft className="w-3.5 h-3.5" /> Back to login</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
