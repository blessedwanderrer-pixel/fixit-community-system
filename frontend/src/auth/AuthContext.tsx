import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { apiRequest } from '../lib/api';
import { getSupabaseClient } from '../lib/supabase';
import type { CurrentUser } from './types';
import { hasRecoveryCallbackParameters, hasRecoveryError, updateRecoveredPassword } from './passwordRecovery';
import { registerCitizen, type CitizenSignupResult } from './signup';

export type PasswordRecoveryStatus = 'idle' | 'checking' | 'valid' | 'invalid' | 'complete';

interface AuthContextValue {
  session: Session | null;
  user: CurrentUser | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<CurrentUser>;
  signUpCitizen: (name: string, email: string, password: string) => Promise<CitizenSignupResult & { currentUser: CurrentUser | null }>;
  signOut: () => Promise<void>;
  passwordRecoveryStatus: PasswordRecoveryStatus;
  changeRecoveredPassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const readCurrentUser = (session: Session): Promise<CurrentUser> =>
  apiRequest<CurrentUser>('/api/me', { accessToken: session.access_token });

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordRecoveryStatus, setPasswordRecoveryStatus] = useState<PasswordRecoveryStatus>(() => {
    const initialRecoveryUrl = typeof window === 'undefined' ? null : new URL(window.location.href);
    if (!initialRecoveryUrl || initialRecoveryUrl.pathname !== '/reset-password') return 'idle';
    if (hasRecoveryError(initialRecoveryUrl)) return 'invalid';
    return hasRecoveryCallbackParameters(initialRecoveryUrl) ? 'checking' : 'invalid';
  });

  const applySession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setError(null);

    if (!nextSession) {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    try {
      const currentUser = await readCurrentUser(nextSession);
      setUser(currentUser);
      return currentUser;
    } catch (cause) {
      setUser(null);
      const message = cause instanceof Error ? cause.message : 'Unable to load your FixIt profile.';
      setError(message);
      throw cause;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    try {
      const supabase = getSupabaseClient();
      const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (!active) return;
        if (event === 'PASSWORD_RECOVERY') setPasswordRecoveryStatus('valid');
        window.setTimeout(() => {
          if (active) void applySession(nextSession).catch(() => undefined);
        }, 0);
      });
      unsubscribe = () => data.subscription.unsubscribe();

      const recoveryTimeout = window.setTimeout(() => {
        if (active) setPasswordRecoveryStatus((current) => current === 'checking' ? 'invalid' : current);
      }, 5000);
      const originalUnsubscribe = unsubscribe;
      unsubscribe = () => {
        window.clearTimeout(recoveryTimeout);
        originalUnsubscribe();
      };

      void supabase.auth.getSession().then(({ data: sessionData, error: sessionError }) => {
        if (!active) return;
        if (sessionError) throw sessionError;
        return applySession(sessionData.session);
      }).catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Unable to restore your session.');
        setIsLoading(false);
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication is not configured.');
      setIsLoading(false);
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await getSupabaseClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      if (!data.session) throw new Error('Supabase did not return an authenticated session.');
      const currentUser = await applySession(data.session);
      if (!currentUser) throw new Error('Unable to load your FixIt profile.');
      return currentUser;
    } catch (cause) {
      setIsLoading(false);
      const message = cause instanceof Error ? cause.message : 'Authentication failed.';
      setError(message);
      throw cause;
    }
  }, [applySession]);

  const signUpCitizen = useCallback(async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await registerCitizen(name, email, password);
      const currentUser = result.session ? await applySession(result.session) : null;
      if (currentUser && currentUser.role !== 'citizen') {
        await getSupabaseClient().auth.signOut();
        setSession(null);
        setUser(null);
        throw new Error('The new account received an invalid role. Access has been blocked.');
      }
      return { ...result, currentUser };
    } catch (cause) {
      setIsLoading(false);
      const message = cause instanceof Error ? cause.message : 'Unable to create your account.';
      setError(message);
      throw cause;
    } finally {
      setIsLoading(false);
    }
  }, [applySession]);

  const signOut = useCallback(async () => {
    const { error: signOutError } = await getSupabaseClient().auth.signOut();
    if (signOutError) throw signOutError;
    setSession(null);
    setUser(null);
    setError(null);
    setPasswordRecoveryStatus('idle');
  }, []);

  const changeRecoveredPassword = useCallback(async (password: string) => {
    await updateRecoveredPassword(password, passwordRecoveryStatus === 'valid');
    setPasswordRecoveryStatus('complete');
    const { error: signOutError } = await getSupabaseClient().auth.signOut({ scope: 'global' });
    if (signOutError) throw signOutError;
    setSession(null);
    setUser(null);
    setError(null);
  }, [passwordRecoveryStatus]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user,
    isLoading,
    error,
    signIn,
    signUpCitizen,
    signOut,
    passwordRecoveryStatus,
    changeRecoveredPassword,
  }), [changeRecoveredPassword, error, isLoading, passwordRecoveryStatus, session, signIn, signOut, signUpCitizen, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
};
