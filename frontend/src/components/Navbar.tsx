import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, X, ChevronDown, Check, Flame, Edit3, User, HelpCircle, LogOut, Tv, Film, Settings, Users } from 'lucide-react';
import { useProfiles } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { useCatalog } from '../contexts/CatalogContext';
import { useScrolled, useOnClickOutside } from '../hooks';
import { ProfileAvatar } from './ui/ProfileAvatar';
import { Logo } from './ui/TitleArt';
import { SmartImage } from './ui/SmartImage';
import { usePlayTitle } from '../hooks';
import './navbar.css';

export function Navbar() {
  const { profiles, activeProfile, selectProfile, signOut } = useProfiles();
  const { isAuthenticated, signOut: authSignOut } = useAuth();
  const { titles } = useCatalog();
  const isScrolled = useScrolled(20);
  const location = useLocation();
  const navigate = useNavigate();
  const playTitle = usePlayTitle();

  // Search input state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Notifications state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(notifRef, () => setNotificationsOpen(false), notificationsOpen);

  // Profile dropdown state
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(profileRef, () => setProfileOpen(false), profileOpen);

  // Close dropdowns on route change
  useEffect(() => {
    setNotificationsOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  // Keep search input synced with url when on /search
  useEffect(() => {
    if (location.pathname === '/search') {
      const q = new URLSearchParams(location.search).get('q') || '';
      setSearchQuery(q);
      setSearchOpen(true);
    }
  }, [location.pathname, location.search]);

  // Handle search open focus
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  useOnClickOutside(searchContainerRef, () => {
    if (!searchQuery.trim() && location.pathname !== '/search') {
      setSearchOpen(false);
    }
  }, searchOpen);

  useOnClickOutside(profileRef, () => {
    setProfileOpen(false);
  }, profileOpen);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      navigate(`/search?q=${encodeURIComponent(val.trim())}`, { replace: location.pathname === '/search' });
    } else if (location.pathname === '/search') {
      navigate('/search', { replace: true });
    }
  };

  // Recent 4 titles for notification popover
  const recentNotifications = titles
    .filter((t) => t.recentlyAdded || t.newEpisodes)
    .slice(0, 4);

  return (
    <>
      <header className={`navbar ${isScrolled ? 'navbar--scrolled' : ''}`}>
        <div className="navbar__left">
          <Link to="/" className="navbar__brand" aria-label="Vybe Home">
            <Logo />
          </Link>

          <nav className="navbar__nav" aria-label="Main Navigation">
            <ul className="navbar__links">
              <li>
                <NavLink to="/" end className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink to="/tv" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
                  TV Shows
                </NavLink>
              </li>
              <li>
                <NavLink to="/movies" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
                  Movies
                </NavLink>
              </li>
              <li>
                <NavLink to="/latest" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
                  New & Popular
                </NavLink>
              </li>
              <li>
                <NavLink to="/community" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
                  Community
                </NavLink>
              </li>
              <li>
                <NavLink to="/browse/languages" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
                  Browse by Languages
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>

        <div className="navbar__right">
          {/* Animated Expanding Search */}
          <div ref={searchContainerRef} className={`nav-search ${searchOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="nav-btn nav-search__toggle"
              onClick={() => {
                setSearchOpen((prev) => !prev);
              }}
              aria-label="Search"
            >
              <Search size={20} />
            </button>
            <form onSubmit={handleSearchSubmit} className="nav-search__form">
              <input
                ref={searchInputRef}
                type="text"
                className="nav-search__input"
                placeholder="Titles, people, genres..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="nav-search__clear"
                  onClick={() => {
                    setSearchQuery('');
                    if (location.pathname === '/search') navigate('/search');
                  }}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </form>
          </div>

          {/* Authenticated Controls vs Sign In Button */}
          {isAuthenticated ? (
            <>
              {/* Kids mode indicator */}
              {activeProfile?.kids && (
                <span className="navbar__kids-badge">KIDS</span>
              )}

              {/* Notifications Dropdown */}
              <div ref={notifRef} className="nav-dropdown-wrapper">
                <button
                  type="button"
                  className="nav-btn nav-notif-btn"
                  onClick={() => setNotificationsOpen((prev) => !prev)}
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                >
                  <Bell size={20} />
                  {recentNotifications.length > 0 && <span className="nav-notif-dot" />}
                </button>

                {notificationsOpen && (
                  <div className="nav-dropdown notif-dropdown">
                    <div className="notif-dropdown__header">
                      <span>Notifications</span>
                    </div>
                    <div className="notif-dropdown__list">
                      {recentNotifications.map((t) => (
                        <div
                          key={t.id}
                          className="notif-item"
                          onClick={() => {
                            setNotificationsOpen(false);
                            playTitle(t);
                          }}
                        >
                          <div className="notif-item__thumb">
                            <SmartImage src={t.backdrop} alt={t.name} />
                          </div>
                          <div className="notif-item__info">
                            <p className="notif-item__text">
                              {t.newEpisodes ? 'New Episodes Available' : 'New Arrival'}
                            </p>
                            <p className="notif-item__title">{t.name}</p>
                            <span className="notif-item__time">Recently added</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div
                ref={profileRef}
                className="nav-dropdown-wrapper profile-dropdown-wrapper"
              >
                <button
                  type="button"
                  className="navbar__profile-trigger"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  aria-label="Account menu"
                  aria-expanded={profileOpen}
                >
                  <ProfileAvatar avatar={activeProfile?.avatar ?? 0} size={32} />
                  <ChevronDown size={14} className={`profile-chevron ${profileOpen ? 'rotated' : ''}`} />
                </button>

                {profileOpen && (
                  <div className="nav-dropdown profile-dropdown">
                    {/* Other profiles */}
                    <div className="profile-dropdown__list">
                      {profiles
                        .filter((p) => p.id !== activeProfile?.id)
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="profile-dropdown__item profile-switch-btn"
                            onClick={() => {
                              selectProfile(p.id);
                              setProfileOpen(false);
                            }}
                          >
                            <ProfileAvatar avatar={p.avatar} size={28} />
                            <span>{p.name}</span>
                            {p.kids && <span className="profile-item__kids">KIDS</span>}
                          </button>
                        ))}

                      <Link
                        to="/profiles"
                        className="profile-dropdown__item profile-manage-link"
                        onClick={() => setProfileOpen(false)}
                      >
                        <Edit3 size={18} />
                        <span>Manage Profiles</span>
                      </Link>
                    </div>

                    <div className="profile-dropdown__divider" />

                    <div className="profile-dropdown__list">
                      <Link
                        to="/community"
                        className="profile-dropdown__item"
                        onClick={() => setProfileOpen(false)}
                      >
                        <Users size={18} />
                        <span>Community &amp; Social</span>
                      </Link>
                      <Link
                        to="/my-list"
                        className="profile-dropdown__item"
                        onClick={() => setProfileOpen(false)}
                      >
                        <Check size={18} />
                        <span>My List</span>
                      </Link>
                      <Link
                        to="/account"
                        className="profile-dropdown__item"
                        onClick={() => setProfileOpen(false)}
                      >
                        <User size={18} />
                        <span>Account</span>
                      </Link>
                      <Link
                        to="/settings"
                        className="profile-dropdown__item"
                        onClick={() => setProfileOpen(false)}
                      >
                        <Settings size={18} />
                        <span>Settings</span>
                      </Link>
                      <Link
                        to="/help"
                        className="profile-dropdown__item"
                        onClick={() => setProfileOpen(false)}
                      >
                        <HelpCircle size={18} />
                        <span>Help Center</span>
                      </Link>
                    </div>

                    <div className="profile-dropdown__divider" />

                    <button
                      type="button"
                      className="profile-dropdown__item profile-signout-btn"
                      onClick={async () => {
                        await authSignOut();
                        signOut();
                        setProfileOpen(false);
                        navigate('/login');
                      }}
                    >
                      <LogOut size={18} />
                      <span>Sign out of Vybe</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              to="/login"
              className="btn btn--red btn--sm"
              style={{ fontSize: '0.85rem', padding: '0.45em 1.25em', fontWeight: 700 }}
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (Responsive Navigation) */}
      <nav className="bottom-nav" aria-label="Mobile Navigation">
        <NavLink to="/" end className={({ isActive }) => `bottom-nav__item ${isActive ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" />
          </svg>
          <span>Home</span>
        </NavLink>
        <NavLink to="/tv" className={({ isActive }) => `bottom-nav__item ${isActive ? 'active' : ''}`}>
          <Tv size={20} />
          <span>TV Shows</span>
        </NavLink>
        <NavLink to="/movies" className={({ isActive }) => `bottom-nav__item ${isActive ? 'active' : ''}`}>
          <Film size={20} />
          <span>Movies</span>
        </NavLink>
        <NavLink to="/latest" className={({ isActive }) => `bottom-nav__item ${isActive ? 'active' : ''}`}>
          <Flame size={20} />
          <span>New &amp; Hot</span>
        </NavLink>
        <NavLink to="/community" className={({ isActive }) => `bottom-nav__item ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          <span>Community</span>
        </NavLink>
      </nav>
    </>
  );
}

