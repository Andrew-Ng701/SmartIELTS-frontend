const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRequired(value: string, label: string) {
  return value.trim() ? null : `${label} is required.`;
}

export function validateEmail(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return 'Email address is required.';
  }

  return EMAIL_PATTERN.test(trimmedValue) ? null : 'Enter a valid email address.';
}

export function validatePassword(value: string, label = 'Password', minLength = 8) {
  if (!value) {
    return `${label} is required.`;
  }

  return value.length >= minLength ? null : `${label} must be at least ${minLength} characters.`;
}

export function validatePasswordConfirmation(newPassword: string, confirmPassword: string) {
  if (!confirmPassword) {
    return 'Confirm password is required.';
  }

  return newPassword === confirmPassword ? null : 'New password and confirmation do not match.';
}

export function validateBandValue(value: string, label: string) {
  const trimmedValue = value.trim();
  const numericValue = Number(trimmedValue);

  if (!trimmedValue) {
    return `${label} is required.`;
  }

  if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 9) {
    return `${label} must be between 0 and 9.`;
  }

  return numericValue * 2 === Math.round(numericValue * 2)
    ? null
    : `${label} must use whole or half bands.`;
}
