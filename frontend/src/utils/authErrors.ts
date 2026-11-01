/**
 * Maps raw backend / Supabase auth errors into friendly, readable messages for users.
 */
export function formatAuthError(error: unknown, mode: 'signin' | 'signup' = 'signin'): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const rawMessage =
    typeof error === 'string'
      ? error
      : (error as any)?.message || (error as any)?.error_description || '';

  const lower = rawMessage.toLowerCase();

  // 1. Missing or invalid service configuration
  if (lower.includes('supabase') && (lower.includes('not configured') || lower.includes('anon key'))) {
    return 'Authentication service is currently unavailable. Please try again later.';
  }

  // 2. Invalid credentials (wrong password or user does not exist)
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_grant') ||
    lower.includes('invalid credentials')
  ) {
    return mode === 'signin'
      ? 'Incorrect email or password. Please double-check your credentials and try again.'
      : 'Unable to sign in with these credentials.';
  }

  // 3. User already registered
  if (lower.includes('user already registered') || lower.includes('already exists') || lower.includes('already in use')) {
    return 'An account with this email already exists. Please switch to Sign In.';
  }

  // 4. Invalid email format
  if (
    lower.includes('invalid email') ||
    lower.includes('email address: invalid') ||
    lower.includes('valid email') ||
    lower.includes('unable to validate email')
  ) {
    return 'Please enter a valid email address (e.g. name@example.com).';
  }

  // 5. Unconfirmed email
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in. Check your inbox for the verification link.';
  }

  // 6. Password criteria
  if (
    lower.includes('password') &&
    (lower.includes('at least') || lower.includes('short') || lower.includes('weak') || lower.includes('character'))
  ) {
    return 'Password must be at least 6 characters long.';
  }

  // 7. Rate limits / too many attempts
  if (
    lower.includes('rate limit') ||
    lower.includes('too many') ||
    lower.includes('security purposes') ||
    lower.includes('over_email_send_rate_limit')
  ) {
    return 'Too many attempts. For security, please wait a minute before trying again.';
  }

  // 8. Network / connectivity error
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('connection') ||
    lower.includes('timeout')
  ) {
    return 'Unable to reach the server. Please check your internet connection and try again.';
  }

  // 9. Clean up raw code prefixes like "AuthApiError: "
  const cleaned = rawMessage.replace(/^[a-zA-Z0-9_]+Error:\s*/i, '').trim();
  return cleaned || 'Authentication failed. Please verify your details and try again.';
}

