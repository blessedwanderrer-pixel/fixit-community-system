import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildPasswordResetRedirectUrl,
  hasRecoveryCallbackParameters,
  hasRecoveryError,
  isStrongPassword,
  passwordRules,
  requestPasswordReset,
  updateRecoveredPassword,
} from './passwordRecovery';

const clientWith = (auth: Record<string, unknown>): SupabaseClient => ({ auth } as unknown as SupabaseClient);

describe('password recovery security helpers', () => {
  it('requires a strong password', () => {
    expect(isStrongPassword('short')).toBe(false);
    expect(isStrongPassword('longbutnouppercase1!')).toBe(false);
    expect(isStrongPassword('StrongPassword1!')).toBe(true);
    expect(passwordRules('StrongPassword1!').every((rule) => rule.passed)).toBe(true);
  });

  it('builds local and production reset URLs safely', () => {
    expect(buildPasswordResetRedirectUrl('http://localhost:3000')).toBe('http://localhost:3000/reset-password');
    expect(buildPasswordResetRedirectUrl('https://fixit.example', 'https://fixit.example/reset-password')).toBe('https://fixit.example/reset-password');
    expect(() => buildPasswordResetRedirectUrl('https://fixit.example', 'http://fixit.example/reset-password')).toThrow(/HTTPS/);
  });

  it('sends the configured redirect without exposing a privileged key', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    await requestPasswordReset(
      ' citizen@example.com ',
      clientWith({ resetPasswordForEmail }),
      'https://fixit.example/reset-password',
    );
    expect(resetPasswordForEmail).toHaveBeenCalledWith('citizen@example.com', {
      redirectTo: 'https://fixit.example/reset-password',
    });
  });

  it('does not expose provider account-lookup errors', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: new Error('User not found') });
    await expect(requestPasswordReset(
      'missing@example.com',
      clientWith({ resetPasswordForEmail }),
      'https://fixit.example/reset-password',
    )).rejects.toThrow('Password reset request could not be submitted. Please try again later.');
  });

  it('refuses password updates without a recovery session', async () => {
    const updateUser = vi.fn();
    await expect(updateRecoveredPassword('StrongPassword1!', false, clientWith({ updateUser }))).rejects.toThrow(/invalid or has expired/);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('updates the password only for a valid recovery session', async () => {
    const updateUser = vi.fn().mockResolvedValue({ error: null });
    await updateRecoveredPassword('StrongPassword1!', true, clientWith({ updateUser }));
    expect(updateUser).toHaveBeenCalledWith({ password: 'StrongPassword1!' });
  });

  it('maps expired or reused provider sessions to a safe recovery error', async () => {
    const updateUser = vi.fn().mockResolvedValue({ error: new Error('token already used') });
    await expect(updateRecoveredPassword('StrongPassword1!', true, clientWith({ updateUser }))).rejects.toThrow(/expired or already been used/);
  });

  it('recognizes recovery callbacks and provider errors in query or hash parameters', () => {
    expect(hasRecoveryCallbackParameters(new URL('https://fixit.example/reset-password?code=abc'))).toBe(true);
    expect(hasRecoveryCallbackParameters(new URL('https://fixit.example/reset-password#type=recovery&access_token=abc'))).toBe(true);
    expect(hasRecoveryError(new URL('https://fixit.example/reset-password?error_code=otp_expired'))).toBe(true);
    expect(hasRecoveryCallbackParameters(new URL('https://fixit.example/reset-password'))).toBe(false);
  });
});
