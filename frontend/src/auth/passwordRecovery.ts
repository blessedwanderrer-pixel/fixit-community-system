import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase';

export type PasswordRule = {
  key: 'length' | 'lowercase' | 'uppercase' | 'number' | 'symbol';
  label: string;
  passed: boolean;
};

export const passwordRules = (password: string): PasswordRule[] => [
  { key: 'length', label: 'At least 12 characters', passed: password.length >= 12 },
  { key: 'lowercase', label: 'One lowercase letter', passed: /[a-z]/.test(password) },
  { key: 'uppercase', label: 'One uppercase letter', passed: /[A-Z]/.test(password) },
  { key: 'number', label: 'One number', passed: /\d/.test(password) },
  { key: 'symbol', label: 'One symbol', passed: /[^A-Za-z0-9]/.test(password) },
];

export const isStrongPassword = (password: string): boolean =>
  passwordRules(password).every((rule) => rule.passed);

export const buildPasswordResetRedirectUrl = (
  origin = window.location.origin,
  configuredUrl = import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL?.trim(),
): string => {
  const url = new URL(configuredUrl || '/reset-password', origin);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('Password recovery redirect must use HTTPS outside local development.');
  }
  return url.toString();
};

export const requestPasswordReset = async (
  email: string,
  client: SupabaseClient = getSupabaseClient(),
  redirectTo = buildPasswordResetRedirectUrl(),
): Promise<void> => {
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) throw new Error('Password reset request could not be submitted. Please try again later.');
};

export const updateRecoveredPassword = async (
  password: string,
  hasRecoverySession: boolean,
  client: SupabaseClient = getSupabaseClient(),
): Promise<void> => {
  if (!hasRecoverySession) throw new Error('This password reset link is invalid or has expired.');
  if (!isStrongPassword(password)) throw new Error('The new password does not meet the security requirements.');
  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error('The password could not be updated. The reset link may have expired or already been used.');
};

const recoveryParams = (url: URL): URLSearchParams[] => [
  url.searchParams,
  new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash),
];

export const hasRecoveryError = (url: URL): boolean =>
  recoveryParams(url).some((params) => Boolean(
    params.get('error') || params.get('error_code') || params.get('error_description'),
  ));

export const hasRecoveryCallbackParameters = (url: URL): boolean =>
  recoveryParams(url).some((params) => Boolean(
    params.get('code') || params.get('token_hash') || params.get('access_token') || params.get('type') === 'recovery',
  ));
