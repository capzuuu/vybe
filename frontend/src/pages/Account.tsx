import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfiles } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { ProfileAvatar } from '../components/ui/ProfileAvatar';
import {
  CreditCard,
  ShieldCheck,
  Tv,
  Check,
  ChevronRight,
  LogOut,
  KeyRound,
  Laptop,
  Calendar,
  Lock,
} from 'lucide-react';
import './account.css';

export function Account() {
  const { user, signOut: authSignOut } = useAuth();
  const { profiles, activeProfile, signOut: profileSignOut } = useProfiles();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Playback settings state
  const [autoplayNext, setAutoplayNext] = useState<boolean>(() => {
    return localStorage.getItem('vybe_autoplay_next') !== 'false';
  });
  const [autoplayPreviews, setAutoplayPreviews] = useState<boolean>(() => {
    return localStorage.getItem('vybe_autoplay_previews') !== 'false';
  });

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const userEmail = user?.email || 'viewer@vybe.stream';
  const memberSinceYear = user?.created_at
    ? new Date(user.created_at).getFullYear()
    : new Date().getFullYear();

  // Toggle handlers
  const handleToggleAutoplayNext = () => {
    const nextVal = !autoplayNext;
    setAutoplayNext(nextVal);
    localStorage.setItem('vybe_autoplay_next', String(nextVal));
    showToast(`Autoplay next episode ${nextVal ? 'enabled' : 'disabled'}.`, { icon: 'check' });
  };

  const handleToggleAutoplayPreviews = () => {
    const nextVal = !autoplayPreviews;
    setAutoplayPreviews(nextVal);
    localStorage.setItem('vybe_autoplay_previews', String(nextVal));
    showToast(`Autoplay previews ${nextVal ? 'enabled' : 'disabled'}.`, { icon: 'check' });
  };

  const handleSignOutAllDevices = () => {
    showToast('Signed out of all other devices successfully.', { icon: 'check' });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', { icon: 'info' });
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', { icon: 'info' });
      return;
    }

    setUpdatingPassword(true);
    setTimeout(() => {
      setUpdatingPassword(false);
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully.', { icon: 'check' });
    }, 600);
  };

  const handleSignOut = async () => {
    await authSignOut();
    profileSignOut();
    showToast('Signed out of Vybe.', { icon: 'check' });
    navigate('/login');
  };

  return (
    <div className="account-page">
      {/* Top Header */}
      <header className="account-header">
        <div className="account-header__left">
          <h1 className="account-header__title">Account</h1>
          <span className="account-header__member-since">
            <Calendar size={14} />
            Member Since {memberSinceYear}
          </span>
        </div>
      </header>

      {/* 1. Membership & Billing */}
      <section className="account-section">
        <h2 className="account-section__title">Membership & Billing</h2>
        <div className="account-section__content">
          <div className="account-info-row">
            <div className="account-info-item">
              <span className="account-info-label">Account Email</span>
              <span className="account-info-value">{userEmail}</span>
            </div>
            <button
              type="button"
              className="account-action-link"
              onClick={() => showToast('Email address is verified.', { icon: 'check' })}
            >
              Verify email
            </button>
          </div>

          <div className="account-info-row">
            <div className="account-info-item">
              <span className="account-info-label">Password</span>
              <span className="account-info-value">••••••••••••</span>
            </div>
            <button
              type="button"
              className="account-action-link"
              onClick={() => setShowPasswordModal(true)}
            >
              Change password
            </button>
          </div>

          <div className="account-info-row">
            <div className="account-info-item">
              <span className="account-info-label">Payment Method</span>
              <span className="account-info-value" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <CreditCard size={16} />
                •••• •••• •••• 4242
              </span>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)' }}>
              Next billing: 1st of next month
            </span>
          </div>
        </div>
      </section>

      {/* 2. Plan Details */}
      <section className="account-section">
        <h2 className="account-section__title">Plan Details</h2>
        <div className="account-section__content">
          <div className="account-info-row">
            <div className="account-info-item">
              <span className="account-info-value" style={{ fontSize: '1.1rem' }}>
                Premium (Ultra HD)
              </span>
            </div>
            <span className="account-plan-badge">Active Plan</span>
          </div>

          <div className="account-plan-features">
            <div className="account-plan-feature">
              <Check size={16} />
              <span>4K Ultra HD + HDR Video</span>
            </div>
            <div className="account-plan-feature">
              <Check size={16} />
              <span>Spatial Audio Sound</span>
            </div>
            <div className="account-plan-feature">
              <Check size={16} />
              <span>Watch on 4 screens at once</span>
            </div>
            <div className="account-plan-feature">
              <Check size={16} />
              <span>Unlimited downloads</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Security & Access */}
      <section className="account-section">
        <h2 className="account-section__title">Security & Privacy</h2>
        <div className="account-section__content">
          <div className="account-info-row">
            <div className="account-info-item">
              <span className="account-info-value" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Laptop size={17} color="#46d369" />
                Current Device (Active Now)
              </span>
              <span className="account-info-label">Web Browser • Secure SSL Session</span>
            </div>
            <button
              type="button"
              className="account-action-link"
              onClick={handleSignOutAllDevices}
            >
              Sign out of all devices
            </button>
          </div>
        </div>
      </section>

      {/* 4. Profile & Parental Controls */}
      <section className="account-section">
        <h2 className="account-section__title">Profiles & Controls</h2>
        <div className="account-section__content">
          <div className="account-profiles-grid">
            {profiles.map((p) => {
              const isActive = activeProfile?.id === p.id;
              return (
                <div key={p.id} className="account-profile-row">
                  <div className="account-profile-row__left">
                    <ProfileAvatar avatar={p.avatar} size={38} />
                    <div>
                      <span className="account-profile-row__name">{p.name}</span>
                      {isActive && <span className="account-profile-row__tag">Active</span>}
                      {p.kids && <span className="account-profile-row__tag">KIDS</span>}
                    </div>
                  </div>

                  <span style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)' }}>
                    {p.kids ? 'TV-Y7 / 7+' : 'All Maturity Ratings (18+)'}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.5rem' }}>
            <Link to="/profiles" className="account-action-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <span>Manage Profiles</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Playback Settings */}
      <section className="account-section">
        <h2 className="account-section__title">Playback Settings</h2>
        <div className="account-section__content">
          <div className="account-toggle-row">
            <div className="account-toggle-label">
              <span className="account-toggle-title">Autoplay next episode</span>
              <span className="account-toggle-desc">
                Automatically play the next episode in a series on all devices.
              </span>
            </div>
            <label className="account-switch">
              <input
                type="checkbox"
                checked={autoplayNext}
                onChange={handleToggleAutoplayNext}
                aria-label="Autoplay next episode"
              />
              <span className="account-slider" />
            </label>
          </div>

          <div className="account-toggle-row">
            <div className="account-toggle-label">
              <span className="account-toggle-title">Autoplay previews while browsing</span>
              <span className="account-toggle-desc">
                Automatically play video previews and audio while hovering titles.
              </span>
            </div>
            <label className="account-switch">
              <input
                type="checkbox"
                checked={autoplayPreviews}
                onChange={handleToggleAutoplayPreviews}
                aria-label="Autoplay previews"
              />
              <span className="account-slider" />
            </label>
          </div>
        </div>
      </section>

      {/* Footer Sign Out */}
      <div className="account-footer-actions">
        <button
          type="button"
          className="btn-account-signout"
          onClick={handleSignOut}
        >
          <LogOut size={16} />
          <span>Sign Out of Vybe</span>
        </button>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="account-modal-backdrop" onClick={() => setShowPasswordModal(false)}>
          <div className="account-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="account-modal-title">Change Password</h3>
            <form onSubmit={handlePasswordSubmit} className="account-modal-form">
              <input
                type="password"
                className="account-modal-input"
                placeholder="New Password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <input
                type="password"
                className="account-modal-input"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <div className="account-modal-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--red"
                  disabled={updatingPassword}
                >
                  {updatingPassword ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
