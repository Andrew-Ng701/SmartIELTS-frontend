import { describe, expect, it } from 'vitest';
import {
  validateBandValue,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateRequired,
} from './formValidation';

describe('formValidation', () => {
  it('validates required text and email fields', () => {
    expect(validateRequired('', 'Display name')).toBe('Display name is required.');
    expect(validateRequired('Alex', 'Display name')).toBeNull();
    expect(validateEmail('student@example.com')).toBeNull();
    expect(validateEmail('student')).toBe('Enter a valid email address.');
  });

  it('validates password length and confirmation', () => {
    expect(validatePassword('', 'New password')).toBe('New password is required.');
    expect(validatePassword('short', 'New password')).toBe('New password must be at least 8 characters.');
    expect(validatePassword('password123', 'New password')).toBeNull();
    expect(validatePasswordConfirmation('password123', 'password321')).toBe('New password and confirmation do not match.');
  });

  it('validates IELTS target bands', () => {
    expect(validateBandValue('7.5', 'Reading target')).toBeNull();
    expect(validateBandValue('7.25', 'Reading target')).toBe('Reading target must use whole or half bands.');
    expect(validateBandValue('10', 'Reading target')).toBe('Reading target must be between 0 and 9.');
  });
});
