import React, { useState } from 'react';
import { Check, Info, KeyRound, LoaderCircle, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { FixItLogo } from '../components/brand/FixItLogo';
import { useAuth } from '../auth/AuthContext';
import { passwordRules } from '../auth/passwordRecovery';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { passwordRecoveryStatus, changeRecoveredPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rules = passwordRules(password);
  const validPassword = rules.every((rule) => rule.passed);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!validPassword) return setError('Choose a password that meets every security requirement.');
    if (!passwordsMatch) return setError('The passwords do not match.');
    setIsSubmitting(true);
    try {
      await changeRecoveredPassword(password);
      navigate('/login', { replace: true, state: { passwordReset: true } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The password could not be updated.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const invalid = passwordRecoveryStatus === 'invalid' || passwordRecoveryStatus === 'idle';

  return (
    <div className="min-h-[85vh] bg-stone-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 civic-grid-dark opacity-30 pointer-events-none" />
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-block mb-4"><FixItLogo size="lg" variant="dark" /></div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Choose a new password</h1>
        <p className="mt-2 text-xs text-stone-400">Secure recovery for every FixIt account role.</p>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white rounded border border-stone-200 py-8 px-6 sm:px-10 shadow-2xl">
          {passwordRecoveryStatus === 'checking' ? (
            <div role="status" className="py-6 text-center"><LoaderCircle className="w-7 h-7 mx-auto text-orange-600 animate-spin" /><p className="mt-3 text-xs font-bold text-stone-700">Validating secure reset link…</p></div>
          ) : invalid ? (
            <div role="alert">
              <div className="p-4 rounded bg-red-50 border border-red-200 text-sm text-red-950 flex items-start gap-3"><Info className="w-5 h-5 text-red-700 shrink-0" /><p>This password-reset link is invalid, expired, or has already been used. Request a new link to continue.</p></div>
              <Link to="/forgot-password" className="mt-6 w-full flex items-center justify-center px-4 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded">Request a new link</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label htmlFor="new-password" className="block text-xs font-bold text-stone-700 mb-1">New password</label><input id="new-password" type="password" required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full px-3 py-2 text-xs border border-stone-300 rounded focus:outline-none focus:border-orange-500 font-mono" /></div>
              <div><label htmlFor="confirm-password" className="block text-xs font-bold text-stone-700 mb-1">Confirm new password</label><input id="confirm-password" type="password" required autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full px-3 py-2 text-xs border border-stone-300 rounded focus:outline-none focus:border-orange-500 font-mono" /></div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" aria-label="Password requirements">{rules.map((rule) => <li key={rule.key} className={`flex items-center gap-1.5 text-[11px] ${rule.passed ? 'text-emerald-700' : 'text-stone-500'}`}>{rule.passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}{rule.label}</li>)}</ul>
              {confirmPassword && <p className={`text-xs ${passwordsMatch ? 'text-emerald-700' : 'text-red-700'}`}>{passwordsMatch ? 'Passwords match.' : 'Passwords do not match.'}</p>}
              {error && <div role="alert" className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2"><Info className="w-4 h-4 shrink-0" />{error}</div>}
              <button type="submit" disabled={isSubmitting || !validPassword || !passwordsMatch} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 disabled:bg-stone-300 disabled:cursor-not-allowed rounded transition-colors"><KeyRound className="w-3.5 h-3.5" />{isSubmitting ? 'Updating password…' : 'Update password'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
