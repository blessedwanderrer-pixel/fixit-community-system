import React, { useState } from 'react';
import { CheckCircle2, Info, Lock, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { passwordRules } from '../auth/passwordRecovery';
import { validateCitizenSignup } from '../auth/signup';
import { FixItLogo } from '../components/brand/FixItLogo';
import { useFeedback } from '../ui/FeedbackContext';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { playFeedback } = useFeedback();
  const { signUpCitizen, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const validationError = validateCitizenSignup(name, email, password, confirmPassword);
    if (validationError) {
      setError(validationError);
      playFeedback('error');
      return;
    }
    try {
      const result = await signUpCitizen(name, email, password);
      playFeedback('success');
      if (result.needsEmailConfirmation) setCheckEmail(true);
      else navigate('/citizen', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create your account.');
      playFeedback('error');
    }
  };

  return (
    <main className="min-h-[85vh] bg-stone-900 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 civic-grid-dark opacity-30 pointer-events-none" />
      <div className="absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-600/10 blur-3xl pointer-events-none" />
      <section className="relative z-10 w-full max-w-md" aria-labelledby="signup-title">
        <div className="mb-6 text-center"><FixItLogo size="lg" variant="dark" /></div>
        <div className="rounded border border-stone-200 bg-white px-6 py-8 shadow-2xl sm:px-10">
          {checkEmail ? (
            <div className="text-center" role="status">
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-600" />
              <h1 id="signup-title" className="text-2xl font-black text-stone-900">Check your email</h1>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                If an account can be created for that address, a confirmation link has been sent. Open it to activate your Citizen account.
              </p>
              <Link to="/login" className="mt-6 inline-flex font-bold text-orange-600 hover:underline">Back to login</Link>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 id="signup-title" className="text-2xl font-black text-stone-900">Create Citizen Account</h1>
                <p className="mt-2 text-xs leading-5 text-stone-500">Register securely to report and track community problems.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="signup-name" className="mb-1 block text-xs font-bold text-stone-700">Full Name</label>
                  <input id="signup-name" type="text" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none" />
                </div>
                <div>
                  <label htmlFor="signup-email" className="mb-1 block text-xs font-bold text-stone-700">Email Address</label>
                  <input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded border border-stone-300 px-3 py-2 text-sm font-mono focus:border-orange-500 focus:outline-none" />
                </div>
                <div>
                  <label htmlFor="signup-password" className="mb-1 block text-xs font-bold text-stone-700">Password</label>
                  <input id="signup-password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none" />
                </div>
                <div>
                  <label htmlFor="signup-confirm" className="mb-1 block text-xs font-bold text-stone-700">Confirm Password</label>
                  <input id="signup-confirm" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none" />
                </div>
                <div className="rounded bg-stone-50 p-3 text-xs text-stone-600">
                  <p className="mb-2 font-bold text-stone-800">Password requirements</p>
                  <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {passwordRules(password).map((rule) => <li key={rule.key} className={rule.passed ? 'text-emerald-700' : ''}>{rule.passed ? '✓' : '○'} {rule.label}</li>)}
                  </ul>
                </div>
                <div className="flex items-center gap-1 text-xs text-stone-500"><Lock className="h-3 w-3" /> Secure Citizen registration</div>
                {error && <div role="alert" className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-900"><Info className="mt-0.5 h-4 w-4 shrink-0 text-red-700" /><span>{error}</span></div>}
                <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-500 disabled:cursor-wait disabled:bg-orange-400">
                  <UserPlus className="h-4 w-4" /> {isLoading ? 'Creating Account…' : 'Create Citizen Account'}
                </button>
              </form>
              <p className="mt-6 border-t border-stone-100 pt-4 text-center text-xs text-stone-500">Already have an account? <Link to="/login" className="font-bold text-orange-600 hover:underline">Sign In</Link></p>
            </>
          )}
        </div>
      </section>
    </main>
  );
};
