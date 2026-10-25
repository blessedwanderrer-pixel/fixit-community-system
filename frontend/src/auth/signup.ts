import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase';
import { isStrongPassword } from './passwordRecovery';

export type CitizenSignupResult = {
  session: Session | null;
  user: User | null;
  needsEmailConfirmation: boolean;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateCitizenSignup = (
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
): string | null => {
  if (name.trim().length < 2) return 'Enter your full name.';
  if (!emailPattern.test(email.trim())) return 'Enter a valid email address.';
  if (!isStrongPassword(password)) return 'Your password does not meet the security requirements.';
  if (password !== confirmPassword) return 'Passwords do not match.';
  return null;
};

export const buildSignupRedirectUrl = (
  origin = window.location.origin,
  configuredUrl = import.meta.env.VITE_SIGNUP_REDIRECT_URL?.trim(),
): string => {
  const url = new URL(configuredUrl || '/login?email-confirmed=true', origin);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('Signup confirmation redirect must use HTTPS outside local development.');
  }
  return url.toString();
};

const safeSignupError = (message: string): Error => {
  const normalized = message.toLowerCase();
  if (normalized.includes('signup') && (normalized.includes('disabled') || normalized.includes('not allowed'))) {
    return new Error('Account creation is currently unavailable. Please contact FixIt support.');
  }
  if (normalized.includes('rate') || normalized.includes('too many')) {
    return new Error('Too many signup attempts. Please wait and try again.');
  }
  if (normalized.includes('password')) {
    return new Error('The password was not accepted. Please review the password requirements.');
  }
  return new Error('Unable to create your account. Please try again later.');
};

export const registerCitizen = async (
  name: string,
  email: string,
  password: string,
  client: SupabaseClient = getSupabaseClient(),
  emailRedirectTo = buildSignupRedirectUrl(),
): Promise<CitizenSignupResult> => {
  const { data, error } = await client.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo,
      // Display metadata only. The database trigger assigns the authoritative role.
      data: { full_name: name.trim() },
    },
  });

  if (error) throw safeSignupError(error.message);

  // With email confirmation enabled, Supabase may deliberately obscure whether
  // an address already exists. Treat every session-less result identically.
  return {
    session: data.session,
    user: data.user,
    needsEmailConfirmation: !data.session,
  };
};
