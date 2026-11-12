import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { Logo } from '../ui/TitleArt';
import { signInAdminWithEmail } from '../../lib/supabase';
import { formatAuthError } from '../../utils/authErrors';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;
const LOCKOUT_KEY = 'vybe_admin_login_lockout_until';
const ATTEMPTS_KEY = 'vybe_admin_login_failed_attempts';

function getRemainingLockout(): number {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return 0;
    const diff = parseInt(raw, 10) - Date.now();
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
  } catch {
    return 0;
  }
}

function getFailedAttempts(): number {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function formatTimer(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

interface AdminLoginViewProps {
  externalError?: string | null;
  onBeforeSubmit?: () => void;
}

export function AdminLoginView({ externalError, onBeforeSubmit }: AdminLoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(externalError || null);
  const [failedAttempts, setFailedAttempts] = useState<number>(getFailedAttempts);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(getRemainingLockout);

  const isLocked = lockoutRemaining > 0;

  useEffect(() => {
    if (externalError) {
      setErrorMsg(externalError);
    }
  }, [externalError]);

  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = window.setInterval(() => {
      const remaining = getRemainingLockout();
      if (remaining <= 0) {
        setLockoutRemaining(0);
        setFailedAttempts(0);
        try {
          localStorage.removeItem(LOCKOUT_KEY);
          localStorage.removeItem(ATTEMPTS_KEY);
        } catch {
          // ignore
        }
        setErrorMsg(null);
      } else {
        setLockoutRemaining(remaining);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockoutRemaining]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isLocked) {
      setErrorMsg(`Too many failed attempts. Locked for ${formatTimer(lockoutRemaining)}.`);
      return;
    }

    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMsg('Please enter a valid admin email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    onBeforeSubmit?.();
    try {
      await signInAdminWithEmail(cleanEmail, password);
      try {
        localStorage.removeItem(LOCKOUT_KEY);
        localStorage.removeItem(ATTEMPTS_KEY);
      } catch {
        // ignore
      }
      setFailedAttempts(0);
      setLockoutRemaining(0);
    } catch (err: any) {
      const next = failedAttempts + 1;
      setFailedAttempts(next);
      try {
        localStorage.setItem(ATTEMPTS_KEY, String(next));
      } catch {
        // ignore
      }
      if (next >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_DURATION_MS;
        try {
          localStorage.setItem(LOCKOUT_KEY, String(until));
        } catch {
          // ignore
        }
        setLockoutRemaining(Math.ceil(LOCKOUT_DURATION_MS / 1000));
        setErrorMsg('Too many failed login attempts. Admin access locked for 5 minutes.');
      } else {
        const remaining = MAX_ATTEMPTS - next;
        const readable = formatAuthError(err, 'signin');
        setErrorMsg(
          `${readable} (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login-shell">
      <div className="admin-login-ambient" aria-hidden="true" />

      <div className="admin-login-card">
        <div className="admin-login-brand-row">
          <Logo size="sm" />
          <span className="admin-badge">
            <ShieldCheck size={13} aria-hidden="true" />
            <span>Admin Console</span>
          </span>
        </div>

        <h1 className="admin-login-title">Admin Sign In</h1>
        <p className="admin-login-subtitle">
          Single-login access to monitor registered accounts, active visitors, and real-time streams via Supabase Realtime.
        </p>

        {isLocked && (
          <div className="admin-alert admin-alert--error" role="alert">
            <Lock size={17} aria-hidden="true" />
            <div>
              <strong>Login temporarily locked</strong>
              <div className="admin-alert__sub">
                Try again in {formatTimer(lockoutRemaining)}.
              </div>
            </div>
          </div>
        )}

        {errorMsg && !isLocked && (
          <div className="admin-alert admin-alert--error" role="alert">
            <AlertCircle size={17} aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-login-form" noValidate>
          <div className="admin-field">
            <label htmlFor="admin-email" className="admin-field__label">
              Admin Email
            </label>
            <input
              id="admin-email"
              type="email"
              className="admin-input"
              placeholder="admin@yourdomain.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              autoComplete="username"
              disabled={submitting || isLocked}
              required
            />
          </div>

          <div className="admin-field">
            <label htmlFor="admin-password" className="admin-field__label">
              Password
            </label>
            <div className="admin-input-wrap">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                className="admin-input admin-input--password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                autoComplete="current-password"
                disabled={submitting || isLocked}
                required
              />
              <button
                type="button"
                className="admin-input-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="admin-submit-btn"
            disabled={submitting || isLocked}
          >
            {submitting ? (
              <span className="spinner spinner--sm spinner--white" />
            ) : isLocked ? (
              `Locked (${formatTimer(lockoutRemaining)})`
            ) : (
              'Sign In to Admin Dashboard'
            )}
          </button>
        </form>

        <div className="admin-login-footer">
          <Link to="/" className="admin-back-link">
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Return to Vybe</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
