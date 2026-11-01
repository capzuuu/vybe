import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfiles, useLibrary } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { ProfileAvatar } from '../components/ui/ProfileAvatar';
import {
  Settings as SettingsIcon,
  Sliders,
  Tv,
  Subtitles,
  Volume2,
  Trash2,
  Check,
  ChevronRight,
  Shield,
  Bell,
  Film,
} from 'lucide-react';
import './settings.css';

export function Settings() {
  const { activeProfile, profiles } = useProfiles();
  const { progress, myList, clearHistory, clearMyList } = useLibrary();
  const { showToast } = useToast();

  // Preferences state (persisted to localStorage)
  const [language, setLanguage] = useState<string>(() => {
    return localStorage.getItem('vybe_pref_lang') || 'English';
  });

  const [subtitles, setSubtitles] = useState<string>(() => {
    return localStorage.getItem('vybe_pref_subs') || 'English [CC]';
  });

  const [subtitleSize, setSubtitleSize] = useState<string>(() => {
    return localStorage.getItem('vybe_pref_sub_size') || 'Medium';
  });

  const [quality, setQuality] = useState<string>(() => {
    return localStorage.getItem('vybe_pref_quality') || 'Best (4K UHD)';
  });

  const [autoplayNext, setAutoplayNext] = useState<boolean>(() => {
    return localStorage.getItem('vybe_autoplay_next') !== 'false';
  });

  const [autoplayPreviews, setAutoplayPreviews] = useState<boolean>(() => {
    return localStorage.getItem('vybe_autoplay_previews') !== 'false';
  });

  const [notifReleases, setNotifReleases] = useState<boolean>(() => {
    return localStorage.getItem('vybe_notif_releases') !== 'false';
  });

  const [notifTips, setNotifTips] = useState<boolean>(() => {
    return localStorage.getItem('vybe_notif_tips') !== 'false';
  });

  // Handlers
  const handleLanguageChange = (val: string) => {
    setLanguage(val);
    localStorage.setItem('vybe_pref_lang', val);
    showToast(`Display language updated to ${val}.`, { icon: 'check' });
  };

  const handleSubtitlesChange = (val: string) => {
    setSubtitles(val);
    localStorage.setItem('vybe_pref_subs', val);
    showToast(`Preferred subtitles set to ${val}.`, { icon: 'check' });
  };

  const handleSubtitleSizeChange = (val: string) => {
    setSubtitleSize(val);
    localStorage.setItem('vybe_pref_sub_size', val);
    showToast(`Subtitle appearance updated: ${val}.`, { icon: 'check' });
  };

  const handleQualityChange = (val: string) => {
    setQuality(val);
    localStorage.setItem('vybe_pref_quality', val);
    showToast(`Streaming video quality set to ${val}.`, { icon: 'check' });
  };

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

  const handleToggleNotifReleases = () => {
    const nextVal = !notifReleases;
    setNotifReleases(nextVal);
    localStorage.setItem('vybe_notif_releases', String(nextVal));
    showToast(`New release alerts ${nextVal ? 'enabled' : 'disabled'}.`, { icon: 'check' });
  };

  const handleToggleNotifTips = () => {
    const nextVal = !notifTips;
    setNotifTips(nextVal);
    localStorage.setItem('vybe_notif_tips', String(nextVal));
    showToast(`Recommendations & viewing updates ${nextVal ? 'enabled' : 'disabled'}.`, {
      icon: 'check',
    });
  };

  const handleClearHistory = () => {
    if (progress.length === 0) {
      showToast('No watch history to clear.', { icon: 'info' });
      return;
    }
    if (
      window.confirm(
        `Are you sure you want to clear the recent watch history for ${activeProfile?.name || 'this profile'}?`
      )
    ) {
      clearHistory();
      showToast(`Watch history cleared for ${activeProfile?.name || 'this profile'}.`, {
        icon: 'check',
      });
    }
  };

  const handleClearMyList = () => {
    if (myList.length === 0) {
      showToast('My List is already empty.', { icon: 'info' });
      return;
    }
    if (
      window.confirm(
        `Are you sure you want to remove all ${myList.length} titles from My List for ${activeProfile?.name || 'this profile'}?`
      )
    ) {
      clearMyList();
      showToast(`My List cleared for ${activeProfile?.name || 'this profile'}.`, {
        icon: 'check',
      });
    }
  };

  return (
    <div className="settings-page">
      {/* Header */}
      <header className="settings-header">
        <h1 className="settings-header__title">Settings & Preferences</h1>
      </header>

      {/* Active Profile Info Banner */}
      <section className="settings-profile-banner" aria-label="Active Profile">
        <div className="settings-profile-left">
          <ProfileAvatar avatar={activeProfile?.avatar ?? 0} size={50} />
          <div className="settings-profile-info">
            <span className="settings-profile-name">
              {activeProfile?.name || 'Alex'}
              {activeProfile?.kids && <span className="settings-profile-badge">Kids</span>}
            </span>
            <span className="settings-profile-sub">
              Active profile • Settings apply to {activeProfile?.name || 'this profile'}
            </span>
          </div>
        </div>

        <Link to="/profiles" className="btn btn--ghost btn--sm" style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
          <span>Switch Profile</span>
          <ChevronRight size={16} />
        </Link>
      </section>

      {/* 1. Language & Audio Preferences */}
      <section className="settings-section">
        <h2 className="settings-section__title">Language & Audio</h2>
        <div className="settings-section__content">
          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">Display & Audio Language</span>
              <span className="settings-row__desc">
                Preferred audio dialogue language for movies and series when available.
              </span>
            </div>
            <select
              className="settings-select"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              aria-label="Display & Audio Language"
            >
              <option value="English">English</option>
              <option value="Spanish">Español (Spanish)</option>
              <option value="French">Français (French)</option>
              <option value="German">Deutsch (German)</option>
              <option value="Japanese">日本語 (Japanese)</option>
              <option value="Filipino">Filipino (Tagalog)</option>
            </select>
          </div>

          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">Subtitles & Captions</span>
              <span className="settings-row__desc">
                Default subtitle language for video playback.
              </span>
            </div>
            <select
              className="settings-select"
              value={subtitles}
              onChange={(e) => handleSubtitlesChange(e.target.value)}
              aria-label="Subtitles & Captions"
            >
              <option value="Off">Off</option>
              <option value="English [CC]">English [CC]</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="German">German</option>
            </select>
          </div>

          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">Subtitle Appearance</span>
              <span className="settings-row__desc">
                Select your preferred caption size on screen.
              </span>
            </div>
            <select
              className="settings-select"
              value={subtitleSize}
              onChange={(e) => handleSubtitleSizeChange(e.target.value)}
              aria-label="Subtitle Appearance"
            >
              <option value="Small">Small (75%)</option>
              <option value="Medium">Medium (100% - Default)</option>
              <option value="Large">Large (125%)</option>
            </select>
          </div>
        </div>
      </section>

      {/* 2. Playback & Video Quality */}
      <section className="settings-section">
        <h2 className="settings-section__title">Playback Controls</h2>
        <div className="settings-section__content">
          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">Autoplay Next Episode</span>
              <span className="settings-row__desc">
                Automatically start the next episode in a series when finishing an episode.
              </span>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={autoplayNext}
                onChange={handleToggleAutoplayNext}
                aria-label="Autoplay next episode"
              />
              <span className="settings-slider" />
            </label>
          </div>

          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">Autoplay Video Previews</span>
              <span className="settings-row__desc">
                Automatically play video previews and audio while hovering movie cards.
              </span>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={autoplayPreviews}
                onChange={handleToggleAutoplayPreviews}
                aria-label="Autoplay video previews"
              />
              <span className="settings-slider" />
            </label>
          </div>

          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">Streaming Video Quality</span>
              <span className="settings-row__desc">
                Manage your video resolution and bandwidth usage.
              </span>
            </div>
            <select
              className="settings-select"
              value={quality}
              onChange={(e) => handleQualityChange(e.target.value)}
              aria-label="Streaming Video Quality"
            >
              <option value="Auto">Auto (Recommended)</option>
              <option value="Data Saver">Data Saver (Standard 480p)</option>
              <option value="High (1080p)">High Definition (1080p FHD)</option>
              <option value="Best (4K UHD)">Ultra High Definition (4K + HDR)</option>
            </select>
          </div>
        </div>
      </section>

      {/* 3. Notifications */}
      <section className="settings-section">
        <h2 className="settings-section__title">Notifications</h2>
        <div className="settings-section__content">
          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">New Release Alerts</span>
              <span className="settings-row__desc">
                Get notified when new movies, seasons, and episodes are added to Vybe.
              </span>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={notifReleases}
                onChange={handleToggleNotifReleases}
                aria-label="New Release Alerts"
              />
              <span className="settings-slider" />
            </label>
          </div>

          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">Personalized Recommendations</span>
              <span className="settings-row__desc">
                Receive suggestions tailored to your watch history and saved list.
              </span>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={notifTips}
                onChange={handleToggleNotifTips}
                aria-label="Personalized Recommendations"
              />
              <span className="settings-slider" />
            </label>
          </div>
        </div>
      </section>

      {/* 4. Profile History & Privacy */}
      <section className="settings-section">
        <h2 className="settings-section__title">History & Library</h2>
        <div className="settings-section__content">
          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">Recent Watch History</span>
              <span className="settings-row__desc">
                {progress.length} {progress.length === 1 ? 'title' : 'titles'} currently in Continue Watching for {activeProfile?.name || 'this profile'}.
              </span>
            </div>
            <button
              type="button"
              className="btn-danger-outline"
              onClick={handleClearHistory}
            >
              <Trash2 size={15} />
              <span>Clear Watch History</span>
            </button>
          </div>

          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">My List</span>
              <span className="settings-row__desc">
                {myList.length} {myList.length === 1 ? 'title' : 'titles'} saved to My List for {activeProfile?.name || 'this profile'}.
              </span>
            </div>
            <button
              type="button"
              className="btn-danger-outline"
              onClick={handleClearMyList}
            >
              <Trash2 size={15} />
              <span>Clear My List</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

