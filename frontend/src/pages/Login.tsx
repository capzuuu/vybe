import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/ui/TitleArt';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { formatAuthError } from '../utils/authErrors';
import './login.css';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
const LOCKOUT_STORAGE_KEY = 'vybe_login_lockout_until';
const ATTEMPTS_STORAGE_KEY = 'vybe_login_failed_attempts';

function getStoredLockoutRemaining(): number {
  try {
    const raw = localStorage.getItem(LOCKOUT_STORAGE_KEY);
    if (!raw) return 0;
    const unlockTime = parseInt(raw, 10);
    const diff = unlockTime - Date.now();
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
  } catch {
    return 0;
  }
}

function getStoredFailedAttempts(): number {
  try {
    const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function formatLockoutTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Rate limiting state (5 failed attempts -> 5-minute lockout)
  const [failedAttempts, setFailedAttempts] = useState<number>(getStoredFailedAttempts);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(getStoredLockoutRemaining);

  const isLocked = lockoutRemaining > 0;

  // Active countdown timer effect
  useEffect(() => {
    if (lockoutRemaining <= 0) return;

    const interval = setInterval(() => {
      const remaining = getStoredLockoutRemaining();
      if (remaining <= 0) {
        setLockoutRemaining(0);
        setFailedAttempts(0);
        localStorage.removeItem(LOCKOUT_STORAGE_KEY);
        localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
        setErrorMsg(null);
      } else {
        setLockoutRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  const { signIn, signUp, signInWithGoogle, demoSignIn, isAuthenticated, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine return destination (preserves internal movie/episode watch URL while preventing open redirects)
  const getDestination = () => {
    const fromPath = (location.state as any)?.from?.pathname;
    const fromSearch = (location.state as any)?.from?.search || '';
    if (typeof fromPath === 'string' && fromPath.startsWith('/') && !fromPath.startsWith('//')) {
      return `${fromPath}${typeof fromSearch === 'string' ? fromSearch : ''}`;
    }
    return '/';
  };

  // If already logged in, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(getDestination(), { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Listen for Capacitor Chrome Custom Tab close / OAuth callback errors on native APK
  React.useEffect(() => {
    const onBrowserClosed = () => setSubmitting(false);
    const onOAuthError = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setSubmitting(false);
      if (detail) {
        setErrorMsg(formatAuthError(detail, 'signin'));
      }
    };
    window.addEventListener('vybe:oauth-browser-closed', onBrowserClosed);
    window.addEventListener('vybe:oauth-error', onOAuthError);
    return () => {
      window.removeEventListener('vybe:oauth-browser-closed', onBrowserClosed);
      window.removeEventListener('vybe:oauth-error', onOAuthError);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Prevent submission if currently rate-limited/locked down
    if (mode === 'signin' && isLocked) {
      setErrorMsg(`Too many failed attempts. Sign in is locked for ${formatLockoutTime(lockoutRemaining)}.`);
      return;
    }

    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address (e.g. name@example.com).');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify both password fields.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signIn(cleanEmail, password);
        // Successful login -> clear lockout and failed attempts counter
        localStorage.removeItem(LOCKOUT_STORAGE_KEY);
        localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
        setFailedAttempts(0);
        setLockoutRemaining(0);
        navigate(getDestination(), { replace: true });
      } else {
        const res = await signUp(cleanEmail, password, fullName.trim() || undefined);
        if (res.needEmailConfirm) {
          setSuccessMsg('Account created! Please check your email inbox to confirm your registration.');
        } else {
          navigate(getDestination(), { replace: true });
        }
      }
    } catch (err: any) {
      console.warn('Auth error caught:', err);
      if (mode === 'signin') {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        localStorage.setItem(ATTEMPTS_STORAGE_KEY, String(nextAttempts));

        if (nextAttempts >= MAX_ATTEMPTS) {
          const unlockTime = Date.now() + LOCKOUT_DURATION_MS;
          localStorage.setItem(LOCKOUT_STORAGE_KEY, String(unlockTime));
          setLockoutRemaining(Math.ceil(LOCKOUT_DURATION_MS / 1000));
          setErrorMsg('Too many failed attempts. Sign in has been locked for 5 minutes.');
        } else {
          const remainingAttempts = MAX_ATTEMPTS - nextAttempts;
          const readable = formatAuthError(err, mode);
          setErrorMsg(
            `${readable} (${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining before 5-minute lockout)`
          );
        }
      } else {
        setErrorMsg(formatAuthError(err, mode));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      // Supabase OAuth redirects away from the application to Google
    } catch (err: any) {
      console.warn('Google auth error caught:', err);
      setErrorMsg(formatAuthError(err, 'signin'));
      setSubmitting(false);
    }
  };

  const handleDemoLogin = () => {
    demoSignIn('viewer@vybe.stream', 'Vybe Member');
    navigate(getDestination(), { replace: true });
  };

  return (
    <div className="netflix-auth">
      <div className="netflix-auth__bg" />

      {/* Top Header */}
      <header className="netflix-auth__header">
        <Link to="/" className="netflix-auth__brand" aria-label="Vybe Home">
          <Logo />
        </Link>
      </header>

      {/* Main Authentication Section */}
      <main className="netflix-auth__main">
        <div className="netflix-auth__card">
          <h1 className="netflix-auth__title">
            {mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </h1>

          {/* Lockout Notice Banner */}
          {mode === 'signin' && isLocked && (
            <div className="netflix-auth__banner netflix-auth__banner--error">
              <Lock size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Sign In Locked:</strong>
                <div style={{ marginTop: '2px' }}>
                  Too many incorrect attempts. Sign in is locked for{' '}
                  <span style={{ fontWeight: 700, color: '#ffffff' }}>
                    {formatLockoutTime(lockoutRemaining)}
                  </span>
                  .
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (!isLocked || mode !== 'signin') && (
            <div className="netflix-auth__banner netflix-auth__banner--error">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="netflix-auth__banner netflix-auth__banner--success">
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google OAuth Login Button */}
          <button
            type="button"
            className="btn-google"
            onClick={handleGoogleAuth}
            disabled={submitting || (mode === 'signin' && isLocked)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.94 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.93 6.72-4.93z"
              />
            </svg>
            <span>{mode === 'signin' ? 'Sign in with Google' : 'Register with Google'}</span>
          </button>

          <div className="netflix-auth__divider">OR</div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="netflix-auth__form">
            {mode === 'signup' && (
              <div className="netflix-input-group">
                <input
                  type="text"
                  className="netflix-input"
                  placeholder="Full Name (optional)"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="netflix-input-group">
              <input
                type="email"
                className="netflix-input"
                placeholder="Email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                autoComplete="email"
                required
              />
            </div>

            <div className="netflix-input-group">
              <div className="netflix-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="netflix-input"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                />
                <button
                  type="button"
                  className="netflix-input-toggle"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div className="netflix-input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="netflix-input"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              className="btn-netflix-submit"
              disabled={submitting || (mode === 'signin' && isLocked)}
              style={
                mode === 'signin' && isLocked
                  ? {
                      opacity: 0.65,
                      cursor: 'not-allowed',
                      background: '#333333',
                    }
                  : undefined
              }
            >
              {submitting ? (
                <div className="spinner spinner--sm spinner--white" />
              ) : mode === 'signin' && isLocked ? (
                `Sign In Locked (${formatLockoutTime(lockoutRemaining)})`
              ) : mode === 'signin' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>

            {mode === 'signin' && (
              <div className="netflix-auth__extras">
                <label className="netflix-remember">
                  <input type="checkbox" defaultChecked />
                  <span>Remember me</span>
                </label>
                <a href="#help" className="netflix-help-link">
                  Need help?
                </a>
              </div>
            )}
          </form>

          {/* Mode Switcher */}
          <div className="netflix-auth__switch">
            {mode === 'signin' ? (
              <>
                New to Vybe?
                <button
                  type="button"
                  className="netflix-auth__switch-btn"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                >
                  Sign up now.
                </button>
              </>
            ) : (
              <>
                Already have an account?
                <button
                  type="button"
                  className="netflix-auth__switch-btn"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                >
                  Sign in.
                </button>
              </>
            )}
          </div>

          {/* Instant Demo Access Button */}
          {!isConfigured && (
            <button
              type="button"
              className="netflix-demo-btn"
              onClick={handleDemoLogin}
            >
              🚀 Instant Preview / Demo Access
            </button>
          )}

          <div className="netflix-auth__recaptcha">
            This page is protected by Google reCAPTCHA to ensure you're not a bot.{' '}
            <a href="#learn-more">Learn more.</a>
          </div>
        </div>
      </main>

      {/* Netflix Footer */}
      <footer className="netflix-auth__footer">
        <div className="netflix-auth__footer-content">
          <p>Questions? Contact Customer Support (24/7)</p>
          <ul className="netflix-auth__footer-links">
            <li><a href="#faq">FAQ</a></li>
            <li><a href="#help">Help Center</a></li>
            <li><a href="#terms">Terms of Use</a></li>
            <li><a href="#privacy">Privacy</a></li>
            <li><a href="#cookie">Cookie Preferences</a></li>
            <li><a href="#corporate">Corporate Information</a></li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
