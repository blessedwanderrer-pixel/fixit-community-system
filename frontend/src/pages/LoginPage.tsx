import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { FixItLogo } from '../components/brand/FixItLogo';
import { 
  User, 
  Lock, 
  Info,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { roleHomePath } from '../auth/types';
import { useFeedback } from '../ui/FeedbackContext';

export const LoginPage: React.FC = () => {
  const { playFeedback } = useFeedback();
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

  return (
    <div className="min-h-[85vh] bg-stone-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 civic-grid-dark opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-block mb-4">
          <FixItLogo size="lg" variant="dark" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          System Access Shell
        </h2>
        <p className="mt-2 text-xs text-stone-400">
          FixIt Community Problem & Donation Tracking System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white rounded border border-stone-200 py-8 px-6 sm:px-10 shadow-2xl">
          {/* Access Header */}
          <div className="mb-6 p-3.5 rounded bg-stone-50 border border-stone-200 flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-stone-900">
                  Secure FixIt Account Access
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-200 text-stone-700">
                  Backend Verified
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                Your account role is loaded from the FixIt database after authentication.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="account@example.com"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded focus:outline-none focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Security Password / Passcode
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded focus:outline-none focus:border-orange-500 font-mono"
              />
            </div>

            <div className="flex items-center text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-stone-400" />
                TLS Encrypted
              </span>
            </div>

            {visibleError && (
              <div role="alert" className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <span>{visibleError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 disabled:cursor-wait rounded transition-colors shadow-xs"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Verifying Secure Session…' : 'Authenticate Secure Session'}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-stone-100 text-center">
            <p className="text-xs text-stone-500">
              Citizens must sign in before reporting a community issue.{' '}
              <Link to="/report" className="font-bold text-orange-600 hover:underline">
                Continue to authenticated reporting →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
