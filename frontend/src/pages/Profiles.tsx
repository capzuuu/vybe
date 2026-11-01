import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { useProfiles } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { ProfileAvatar } from '../components/ui/ProfileAvatar';
import { AVATARS } from '../data/profiles';
import type { Profile } from '../types';
import './profiles.css';

export function Profiles() {
  const {
    profiles,
    activeProfile,
    selectProfile,
    addProfile,
    updateProfile,
    deleteProfile,
    canAddProfile,
  } = useProfiles();
  const { signOut: authSignOut, user } = useAuth();
  const navigate = useNavigate();

  const [isManaging, setIsManaging] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states for creating / editing
  const [name, setName] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [isKids, setIsKids] = useState(false);

  const handleSelect = (id: string) => {
    if (isManaging) {
      const p = profiles.find((x) => x.id === id);
      if (p) {
        setEditingProfile(p);
        setName(p.name);
        setAvatarIndex(p.avatar);
        setIsKids(p.kids);
      }
    } else {
      selectProfile(id);
      navigate('/');
    }
  };

  const handleStartAdd = () => {
    setIsCreating(true);
    setName('');
    setAvatarIndex(profiles.length % AVATARS.length);
    setIsKids(false);
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addProfile({
      name: name.trim(),
      avatar: avatarIndex,
      kids: isKids,
    });
    setIsCreating(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !name.trim()) return;
    updateProfile(editingProfile.id, {
      name: name.trim(),
      avatar: avatarIndex,
      kids: isKids,
    });
    setEditingProfile(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this profile? All watchlist and history will be removed.')) {
      deleteProfile(id);
      setEditingProfile(null);
    }
  };

  return (
    <div className="profiles-container">
      <div className="profiles-inner">
        <h1 className="profiles-heading">
          {isManaging ? 'Manage Profiles' : "Who's Watching?"}
        </h1>

        <div className="profiles-list">
          {profiles.map((p) => (
            <div
              key={p.id}
              className={`profile-card ${isManaging ? 'managing' : ''}`}
              onClick={() => handleSelect(p.id)}
            >
              <div className="profile-card__avatar-wrapper">
                <ProfileAvatar
                  avatar={p.avatar}
                  size={140}
                  className="profile-card__avatar"
                />

                {isManaging && (
                  <div className="profile-card__edit-overlay">
                    <Edit2 size={32} color="#fff" />
                  </div>
                )}
              </div>

              <span className="profile-card__name">{p.name}</span>
              {p.kids && <span className="profile-card__kids-tag">KIDS</span>}
            </div>
          ))}

          {/* Add Profile Tile */}
          {canAddProfile && !isManaging && (
            <div className="profile-card profile-card--add" onClick={handleStartAdd}>
              <div className="profile-card__avatar-wrapper profile-card__add-box">
                <Plus size={64} />
              </div>
              <span className="profile-card__name">Add Profile</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn--ghost profiles-manage-btn"
            onClick={() => setIsManaging((prev) => !prev)}
          >
            {isManaging ? 'Done' : 'Manage Profiles'}
          </button>
          {!isManaging && (
            <button
              type="button"
              className="btn btn--ghost profiles-manage-btn"
              onClick={() => navigate('/my-list')}
            >
              <Check size={16} />
              <span>My List</span>
            </button>
          )}
        </div>

        <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
          {user?.email && (
            <span style={{ fontSize: '0.85rem', color: 'var(--c-text-3)' }}>
              Signed in as {user.email}
            </span>
          )}
          <button
            type="button"
            className="btn btn--ghost"
            style={{ fontSize: '0.8rem', padding: '0.35em 1.2em', opacity: 0.8 }}
            onClick={async () => {
              await authSignOut();
              navigate('/login');
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Create / Edit Modal Dialog */}
      {(isCreating || editingProfile) && (
        <div className="modal-backdrop">
          <div className="profile-modal">
            <h2 className="profile-modal__title">
              {isCreating ? 'Add Profile' : 'Edit Profile'}
            </h2>
            <p className="profile-modal__subtitle">
              Add a profile for another person watching Vybe.
            </p>

            <form
              onSubmit={isCreating ? handleSaveCreate : handleSaveEdit}
              className="profile-modal__form"
            >
              <div className="profile-modal__avatar-select">
                <ProfileAvatar avatar={avatarIndex} size={90} />
                <div className="profile-modal__avatar-palette">
                  <span>Choose Avatar:</span>
                  <div className="avatar-palette-row">
                    {AVATARS.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`avatar-choice ${avatarIndex === idx ? 'selected' : ''}`}
                        onClick={() => setAvatarIndex(idx)}
                      >
                        <ProfileAvatar avatar={idx} size={36} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <input
                type="text"
                className="input"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                required
              />

              <label className="profile-modal__kids-label">
                <input
                  type="checkbox"
                  checked={isKids}
                  onChange={(e) => setIsKids(e.target.checked)}
                />
                <div>
                  <strong>Kid?</strong>
                  <p>Only show TV shows and movies rated for all ages & kids under 12.</p>
                </div>
              </label>

              <div className="profile-modal__actions">
                <div className="profile-modal__actions-primary">
                  <button type="submit" className="btn btn--light btn--sm">
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setIsCreating(false);
                      setEditingProfile(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>

                {editingProfile && profiles.length > 1 && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm delete-profile-btn"
                    onClick={() => handleDelete(editingProfile.id)}
                  >
                    <Trash2 size={15} />
                    <span>Delete Profile</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

