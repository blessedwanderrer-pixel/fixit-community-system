import { describe, expect, it } from 'vitest';
import { translateExact } from './dictionaries';

const loginCopy = [
  'Citizen access',
  'Your street.',
  'Your report.',
  'Your impact.',
  'Sign in to report a local problem, follow its progress, and see what changes in your community.',
  'Locate',
  'Track',
  'Secure account access',
  'Welcome back.',
  'Enter your account details to continue to FixIt.',
  'Forgot password?',
  'TLS Encrypted',
  'Signing you in…',
  'Sign in securely',
  'Create a free account',
  'Your account and reports are protected.',
] as const;

const homeCopy = [
  'Report · Follow up · See action', 'Your street', 'problem has', 'one place to go.',
  'Send the location and a photo. FixIt gives you a tracking ID so you can follow every update.',
  'Report a problem', 'Sign in to continue', 'Already reported?', 'Find your', 'report.',
  'Check report status', 'Enter tracking ID', 'Check status', 'How to report a problem',
  'Show the problem', 'Add one clear photo.', 'Pin the location', 'Tell us exactly where it is.',
  'Follow the response', 'Use your ID to see each update.', 'Step',
] as const;

describe('login translations', () => {
  it.each(['ur', 'ps'] as const)('provides every %s login string', (language) => {
    loginCopy.forEach((source) => {
      expect(translateExact(source, language)).not.toBe(source);
    });
  });

  it('keeps the authored English copy unchanged', () => {
    loginCopy.forEach((source) => expect(translateExact(source, 'en')).toBe(source));
  });

  it.each(['ur', 'ps'] as const)('provides every %s homepage string', (language) => {
    homeCopy.forEach((source) => expect(translateExact(source, language)).not.toBe(source));
  });
});
