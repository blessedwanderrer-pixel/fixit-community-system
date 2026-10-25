import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildSignupRedirectUrl, registerCitizen, validateCitizenSignup } from './signup';

const clientWithSignup = (signUp: ReturnType<typeof vi.fn>): SupabaseClient => ({
  auth: { signUp },
} as unknown as SupabaseClient);

describe('secure citizen signup', () => {
  it('validates name, email, password strength, and confirmation', () => {
    expect(validateCitizenSignup('', 'citizen@example.com', 'StrongPassword1!', 'StrongPassword1!')).toMatch(/name/i);
    expect(validateCitizenSignup('Citizen Name', 'invalid', 'StrongPassword1!', 'StrongPassword1!')).toMatch(/email/i);
    expect(validateCitizenSignup('Citizen Name', 'citizen@example.com', 'weak', 'weak')).toMatch(/requirements/i);
    expect(validateCitizenSignup('Citizen Name', 'citizen@example.com', 'StrongPassword1!', 'DifferentPassword1!')).toMatch(/match/i);
    expect(validateCitizenSignup('Citizen Name', 'citizen@example.com', 'StrongPassword1!', 'StrongPassword1!')).toBeNull();
  });

  it('sends only display metadata and never accepts a role assignment', async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user', identities: [{}] }, session: null },
      error: null,
    });
    const result = await registerCitizen(
      ' Citizen Name ',
      ' CITIZEN@EXAMPLE.COM ',
      'StrongPassword1!',
      clientWithSignup(signUp),
      'https://fixit.example/login?email-confirmed=true',
    );

    expect(signUp).toHaveBeenCalledWith({
      email: 'citizen@example.com',
      password: 'StrongPassword1!',
      options: {
        emailRedirectTo: 'https://fixit.example/login?email-confirmed=true',
        data: { full_name: 'Citizen Name' },
      },
    });
    expect(JSON.stringify(signUp.mock.calls[0])).not.toContain('admin');
    expect(JSON.stringify(signUp.mock.calls[0])).not.toContain('coordinator');
    expect(result.needsEmailConfirmation).toBe(true);
  });

  it('recognizes immediate sessions when confirmation is disabled', async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user' }, session: { access_token: 'token' } },
      error: null,
    });
    const result = await registerCitizen('Citizen Name', 'citizen@example.com', 'StrongPassword1!', clientWithSignup(signUp), 'https://fixit.example/login');
    expect(result.needsEmailConfirmation).toBe(false);
    expect(result.session).toEqual({ access_token: 'token' });
  });

  it('returns the same confirmation state for provider-obscured duplicate addresses', async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'obscured', identities: [] }, session: null },
      error: null,
    });
    const result = await registerCitizen('Citizen Name', 'existing@example.com', 'StrongPassword1!', clientWithSignup(signUp), 'https://fixit.example/login');
    expect(result.needsEmailConfirmation).toBe(true);
  });

  it('maps disabled signup and provider failures to safe messages', async () => {
    const disabled = vi.fn().mockResolvedValue({ data: {}, error: new Error('Signups not allowed for this instance') });
    await expect(registerCitizen('Citizen Name', 'citizen@example.com', 'StrongPassword1!', clientWithSignup(disabled), 'https://fixit.example/login')).rejects.toThrow(/currently unavailable/);

    const duplicate = vi.fn().mockResolvedValue({ data: {}, error: new Error('User already registered') });
    await expect(registerCitizen('Citizen Name', 'citizen@example.com', 'StrongPassword1!', clientWithSignup(duplicate), 'https://fixit.example/login')).rejects.toThrow('Unable to create your account. Please try again later.');
  });

  it('requires HTTPS for a deployed confirmation redirect', () => {
    expect(buildSignupRedirectUrl('http://localhost:3000')).toBe('http://localhost:3000/login?email-confirmed=true');
    expect(() => buildSignupRedirectUrl('https://fixit.example', 'http://fixit.example/login')).toThrow(/HTTPS/);
  });
});
