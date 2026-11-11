import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useToast } from '../contexts/ToastContext';
import { useLockBodyScroll } from '../hooks';
import gcashLogo from '../assets/gcash-logo.svg';
import gcashQr from '../assets/gcash-qr.jpg';
import {
  Volume2,
  Gift,
  Tv,
  TrendingUp,
  Briefcase,
  FileText,
  Shield,
  Scale,
  Cookie,
  Building2,
  Mail,
  X,
  Check,
  Send,
  MessageSquare,
  Phone,
  HelpCircle,
  ExternalLink,
  Heart,
  QrCode,
  Facebook,
  GitFork,
  Download,
} from 'lucide-react';
import './footer.css';

type ModalKey =
  | 'audio-description'
  | 'gift-cards'
  | 'media-center'
  | 'investor-relations'
  | 'jobs'
  | 'terms'
  | 'privacy'
  | 'legal'
  | 'cookies'
  | 'corporate'
  | 'contact'
  | 'donate'
  | null;

export function Footer() {
  const isNativeApp = Capacitor.isNativePlatform();
  const { showToast } = useToast();
  const [serviceCode, setServiceCode] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalKey>(null);

  // Lock background scrolling when modal is open
  useLockBodyScroll(Boolean(activeModal));

  // Sync modal state with URL hash (e.g. #terms, #privacy, #contact)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      const validModals: ModalKey[] = [
        'audio-description',
        'gift-cards',
        'media-center',
        'investor-relations',
        'jobs',
        'terms',
        'privacy',
        'legal',
        'cookies',
        'corporate',
        'contact',
        'donate',
      ];
      if (hash === 'gcash') {
        setActiveModal('donate');
      } else if (validModals.includes(hash as any)) {
        setActiveModal(hash as ModalKey);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!activeModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeModal]);

  const openModal = (key: ModalKey, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setActiveModal(key);
    window.history.pushState(null, '', `#${key}`);
  };

  const closeModal = () => {
    setActiveModal(null);
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  const handleServiceCode = () => {
    if (!serviceCode) {
      setServiceCode(Math.floor(100000 + Math.random() * 900000).toString());
    } else {
      setServiceCode(null);
    }
  };

  // Interactive modal states
  const [giftCode, setGiftCode] = useState('');
  const [cookieConsent, setCookieConsent] = useState(() => {
    try {
      const saved = localStorage.getItem('vybe_cookie_preferences');
      return saved ? JSON.parse(saved) : { functional: true, analytics: true, marketing: false };
    } catch {
      return { functional: true, analytics: true, marketing: false };
    }
  });

  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    topic: 'Streaming & Video Quality',
    message: '',
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const handleRedeemGift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftCode.trim()) {
      showToast('Please enter a valid gift card code.', { icon: 'info' });
      return;
    }
    showToast(`Gift Card ${giftCode.toUpperCase()} redeemed! $50.00 added to your account.`, {
      icon: 'check',
    });
    setGiftCode('');
    closeModal();
  };

  const handleSaveCookies = () => {
    try {
      localStorage.setItem('vybe_cookie_preferences', JSON.stringify(cookieConsent));
    } catch {}
    showToast('Your cookie preferences have been saved.', { icon: 'check' });
    closeModal();
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      showToast('Please fill in all required contact fields.', { icon: 'info' });
      return;
    }
    const ticketId = Math.floor(100000 + Math.random() * 900000);
    setContactSubmitted(true);
    showToast(`Support Ticket #TKT-${ticketId} created! We'll reply within 2 hours.`, {
      icon: 'check',
    });
    setTimeout(() => {
      setContactSubmitted(false);
      setContactForm({ name: '', email: '', topic: 'Streaming & Video Quality', message: '' });
      closeModal();
    }, 1800);
  };

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer__inner">
        <div className="footer__socials">
          <a href="#facebook" aria-label="Facebook" className="footer__social-link">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
            </svg>
          </a>
          <a href="#instagram" aria-label="Instagram" className="footer__social-link">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </a>
          <a href="#twitter" aria-label="Twitter" className="footer__social-link">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a href="#youtube" aria-label="YouTube" className="footer__social-link">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </a>
        </div>

        <ul className="footer__links">
          <li>
            <button
              type="button"
              className="footer__link-btn"
              onClick={(e) => openModal('audio-description', e)}
            >
              Audio Description
            </button>
          </li>
          <li>
            <Link to="/help">Help Center</Link>
          </li>
          <li>
            <button
              type="button"
              className="footer__link-btn"
              onClick={(e) => openModal('gift-cards', e)}
            >
              Gift Cards
            </button>
          </li>
          <li>
            <button
              type="button"
              className="footer__link-btn"
              onClick={(e) => openModal('media-center', e)}
            >
              Media Center
            </button>
          </li>
          <li>
            <button
              type="button"
              className="footer__link-btn"
              onClick={(e) => openModal('investor-relations', e)}
            >
              Investor Relations
            </button>
          </li>
          <li>
            <button
              type="button"
              className="footer__link-btn"
              onClick={(e) => openModal('jobs', e)}
            >
              Jobs
            </button>
          </li>
          <li>
            <button
              type="button"
              className="footer__link-btn"
              onClick={(e) => openModal('terms', e)}
            >
              Terms of Use
            </button>
          </li>
          <li>
            <button
              type="button"
              className="footer__link-btn"
              onClick={(e) => openModal('privacy', e)}
            >
              Privacy
            </button>
          </li>
          <li>
            <button
              type="button"
              className="footer__link-btn"
              onClick={(e) => openModal('legal', e)}
            >
              Legal Notices
            </button>
          </li>
          <li>
            <button
              type="button"
              className="footer__link-btn"
              onClick={(e) => openModal('cookies', e)}
            >
              Cookie Preferences
            </button>
          </li>
          <li>
            <button
              type="button"
              className="footer__link-btn"
              onClick={(e) => openModal('corporate', e)}
            >
              Corporate Information
            </button>
          </li>
          <li>
            <button
              type="button"
              className="footer__link-btn"
              onClick={(e) => openModal('contact', e)}
            >
              Contact Us
            </button>
          </li>
        </ul>

        {/* Do you like the app? Donate */}
        <div className="footer__donate-simple-wrapper">
          <button
            type="button"
            className="footer__donate-simple"
            onClick={(e) => openModal('donate', e)}
            aria-label="Do you like the app? Donate with GCash"
          >
            <span className="footer__donate-simple-text">Do you like the app? Donate</span>
            <img src={gcashLogo} alt="GCash" className="footer__gcash-inline-logo" />
          </button>
        </div>

        <div className="footer__service">
          <button className="footer__service-btn" onClick={handleServiceCode}>
            {serviceCode ? `Service Code: ${serviceCode}` : 'Service Code'}
          </button>
          {!isNativeApp && (
            <a
              href="/Vybe.apk"
              download="Vybe.apk"
              className="footer__apk-btn"
              onClick={() =>
                showToast('Downloading Vybe Android app (Vybe.apk)…', { icon: 'check' })
              }
            >
              <Download size={14} aria-hidden="true" />
              <span>Download APK</span>
            </a>
          )}
        </div>

        <div className="footer__copyright">
          &copy;{new Date().getFullYear()} Vybe, Inc. Designed for premium cinematic streaming.
        </div>
      </div>

      {/* ── Interactive Pop-Up Dialogs for Footer Links ─────────────────── */}
      {activeModal && (
        <div className="footer-modal-overlay" onClick={closeModal}>
          {activeModal === 'donate' ? (
            <div
              className="donate-compact-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Support Vybe"
            >
              {/* Header */}
              <div className="donate-compact-modal__header">
                <div className="donate-compact-modal__title">
                  <img src={gcashLogo} alt="GCash" className="donate-compact-modal__gcash-logo" />
                  <span>Support Vybe</span>
                </div>
                <button
                  type="button"
                  className="donate-compact-modal__close"
                  onClick={closeModal}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Subtitle description */}
              <p className="donate-compact-modal__desc">
                Enjoying free &amp; ad-free streaming? Scan below with GCash or any InstaPay app to support server &amp; domain maintenance!
              </p>

              {/* QR Card */}
              <div className="donate-compact-modal__qr-card">
                <img
                  src={gcashQr}
                  alt="GCash and InstaPay QR Code"
                  className="donate-compact-modal__qr-image"
                />
              </div>

              {/* Thank you note */}
              <div className="donate-compact-modal__thanks">
                <Heart size={14} className="donate-compact-modal__heart" fill="#007CFF" color="#007CFF" />
                <span>Thank you for supporting Vybe!</span>
              </div>

              {/* Divider line */}
              <div className="donate-compact-modal__divider" />

              {/* Social / contact circular links */}
              <div className="donate-compact-modal__socials">
                <a
                  href="#facebook"
                  className="donate-compact-modal__social-btn"
                  aria-label="Facebook"
                  onClick={(e) => e.preventDefault()}
                >
                  <Facebook size={15} />
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="donate-compact-modal__social-btn"
                  aria-label="GitHub"
                >
                  <GitFork size={15} />
                </a>
                <button
                  type="button"
                  onClick={() => openModal('contact')}
                  className="donate-compact-modal__social-btn"
                  aria-label="Contact Us"
                >
                  <Mail size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div
              className="footer-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* 1. Audio Description */}
            {activeModal === 'audio-description' && (
              <>
                <div className="footer-modal__header">
                  <h2 className="footer-modal__title">
                    <Volume2 className="footer-modal__title-icon" size={24} />
                    <span>Audio Description</span>
                  </h2>
                  <button className="footer-modal__close" onClick={closeModal} aria-label="Close">
                    <X size={20} />
                  </button>
                </div>
                <div className="footer-modal__body">
                  <span className="footer-modal__badge">Accessibility & Inclusion</span>
                  <h3>What is Audio Description?</h3>
                  <p>
                    Audio Description (AD) provides an optional narration track describing visual elements
                    such as character actions, facial expressions, physical settings, and scene changes
                    during natural pauses in dialogue. It allows blind and low-vision viewers to fully immerse
                    themselves in cinematic storytelling.
                  </p>

                  <h3>How to Enable Audio Description</h3>
                  <ul>
                    <li>While playing any movie or TV series on Vybe, open the player controls.</li>
                    <li>Click on the <strong>Audio & Subtitles</strong> dialog icon.</li>
                    <li>Select any audio track tagged with <strong>[Audio Description]</strong>.</li>
                    <li>
                      <strong>Keyboard Shortcut:</strong> Press <code>Alt + A</code> while in playback to immediately
                      toggle between standard audio and Audio Description.
                    </li>
                  </ul>

                  <h3>Supported Devices</h3>
                  <p>
                    Audio Description is supported on modern desktop web browsers (Chrome, Edge, Firefox,
                    Safari), Smart TVs, Apple TV, iOS, and Android mobile devices.
                  </p>
                </div>
                <div className="footer-modal__footer">
                  <button className="btn btn--primary btn--sm" onClick={closeModal}>
                    Got It
                  </button>
                </div>
              </>
            )}

            {/* 2. Gift Cards */}
            {activeModal === 'gift-cards' && (
              <>
                <div className="footer-modal__header">
                  <h2 className="footer-modal__title">
                    <Gift className="footer-modal__title-icon" size={24} />
                    <span>Gift Cards</span>
                  </h2>
                  <button className="footer-modal__close" onClick={closeModal} aria-label="Close">
                    <X size={20} />
                  </button>
                </div>
                <div className="footer-modal__body">
                  <span className="footer-modal__badge">Prepaid Streaming</span>
                  <h3>Redeem a Gift Card</h3>
                  <p>
                    Have a Vybe digital gift card or voucher code? Enter your 16-character code below to add credit
                    directly to your account.
                  </p>
                  <form onSubmit={handleRedeemGift}>
                    <input
                      type="text"
                      className="footer-modal__input"
                      placeholder="e.g. VYBE-8942-7719-ABCD"
                      value={giftCode}
                      onChange={(e) => setGiftCode(e.target.value)}
                    />
                    <button type="submit" className="btn btn--primary btn--sm" style={{ width: '100%' }}>
                      Redeem to Account
                    </button>
                  </form>

                  <h3 style={{ marginTop: '1.75rem' }}>Buy a Gift Card</h3>
                  <p>
                    Give the gift of unlimited movies and shows in 4K HDR. Choose a gift amount:
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {['$25 (1 Mo)', '$50 (2 Mos)', '$100 (Annual)'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() =>
                          showToast(`Selected ${amt} gift package. Redirecting to checkout...`, {
                            icon: 'check',
                          })
                        }
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="footer-modal__footer">
                  <button className="btn btn--ghost btn--sm" onClick={closeModal}>
                    Close
                  </button>
                </div>
              </>
            )}

            {/* 3. Media Center */}
            {activeModal === 'media-center' && (
              <>
                <div className="footer-modal__header">
                  <h2 className="footer-modal__title">
                    <Tv className="footer-modal__title-icon" size={24} />
                    <span>Media Center</span>
                  </h2>
                  <button className="footer-modal__close" onClick={closeModal} aria-label="Close">
                    <X size={20} />
                  </button>
                </div>
                <div className="footer-modal__body">
                  <span className="footer-modal__badge">Press & Newsroom</span>
                  <h3>Recent Press Releases</h3>
                  <ul>
                    <li>
                      <strong>Oct 2024:</strong> Vybe expands spatial audio and next-generation 4K ultra-low-latency streaming engine globally.
                    </li>
                    <li>
                      <strong>Aug 2024:</strong> "Mood-Driven Streaming": How Vybe's dynamic atmosphere curation reached 25M active viewers.
                    </li>
                    <li>
                      <strong>May 2024:</strong> Full integration with TMDB API catalog for rich multi-language metadata support.
                    </li>
                  </ul>

                  <h3>Brand Assets & Logos</h3>
                  <p>
                    Download official high-resolution vector logos, brand color palettes (Vybe Red <code>#E50914</code>),
                    and promotional media kits for accredited journalists and partners.
                  </p>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() =>
                      showToast('Brand kit archive (SVG + PNG assets) downloaded.', { icon: 'check' })
                    }
                  >
                    Download Brand Kit (.zip)
                  </button>

                  <h3 style={{ marginTop: '1.5rem' }}>Media Inquiries</h3>
                  <p>
                    Journalists and media representatives can reach our global communications team at{' '}
                    <a href="mailto:press@vybe.tv" style={{ color: '#ff4d58' }}>
                      press@vybe.tv
                    </a>
                    .
                  </p>
                </div>
                <div className="footer-modal__footer">
                  <button className="btn btn--primary btn--sm" onClick={closeModal}>
                    Done
                  </button>
                </div>
              </>
            )}

            {/* 4. Investor Relations */}
            {activeModal === 'investor-relations' && (
              <>
                <div className="footer-modal__header">
                  <h2 className="footer-modal__title">
                    <TrendingUp className="footer-modal__title-icon" size={24} />
                    <span>Investor Relations</span>
                  </h2>
                  <button className="footer-modal__close" onClick={closeModal} aria-label="Close">
                    <X size={20} />
                  </button>
                </div>
                <div className="footer-modal__body">
                  <span className="footer-modal__badge">NASDAQ: VYBE • $482.15</span>
                  <h3>Financial Highlights</h3>
                  <p>
                    Vybe Entertainment Global, Inc. delivers world-class streaming technology, hyper-personalized catalog discovery,
                    and resilient high-concurrency cloud delivery.
                  </p>
                  <ul>
                    <li><strong>Global Subscribers:</strong> 34.2 Million</li>
                    <li><strong>Platform Uptime:</strong> 99.98% continuous availability</li>
                    <li><strong>Operating Margin:</strong> 28.4% YoY improvement</li>
                  </ul>

                  <h3>Quarterly Earnings & Filings</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div className="job-item">
                      <div>
                        <div className="job-item__title">Q3 2024 Shareholder Letter & Financial Report</div>
                        <div className="job-item__meta">PDF Document • Released Oct 18, 2024</div>
                      </div>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => showToast('Opening Q3 Shareholder Report...', { icon: 'info' })}
                      >
                        View Report
                      </button>
                    </div>
                    <div className="job-item">
                      <div>
                        <div className="job-item__title">Annual Report Form 10-K</div>
                        <div className="job-item__meta">SEC Filing • Audited Annual Financials</div>
                      </div>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => showToast('Opening SEC 10-K filing...', { icon: 'info' })}
                      >
                        View Filing
                      </button>
                    </div>
                  </div>

                  <h3>Investor Contact</h3>
                  <p>
                    Direct inquiries regarding shareholder services to{' '}
                    <a href="mailto:ir@vybe.tv" style={{ color: '#ff4d58' }}>
                      ir@vybe.tv
                    </a>
                    .
                  </p>
                </div>
                <div className="footer-modal__footer">
                  <button className="btn btn--primary btn--sm" onClick={closeModal}>
                    Close
                  </button>
                </div>
              </>
            )}

            {/* 5. Jobs */}
            {activeModal === 'jobs' && (
              <>
                <div className="footer-modal__header">
                  <h2 className="footer-modal__title">
                    <Briefcase className="footer-modal__title-icon" size={24} />
                    <span>Careers at Vybe</span>
                  </h2>
                  <button className="footer-modal__close" onClick={closeModal} aria-label="Close">
                    <X size={20} />
                  </button>
                </div>
                <div className="footer-modal__body">
                  <span className="footer-modal__badge">We're Hiring • 14 Open Roles</span>
                  <h3>Build the Future of Cinematic Streaming</h3>
                  <p>
                    We're a remote-first team of engineers, designers, and film lovers building a seamless, lightning-fast
                    entertainment platform. We offer competitive equity, unlimited PTO, 100% health coverage, and a $3,000 yearly
                    learning stipend.
                  </p>

                  <h3>Featured Openings</h3>
                  <div className="job-item">
                    <div>
                      <div className="job-item__title">Senior Video Infrastructure Engineer</div>
                      <div className="job-item__meta">Engineering • Remote (Global) • Full-Time</div>
                    </div>
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() =>
                        showToast('Application link copied to clipboard!', { icon: 'check' })
                      }
                    >
                      Apply
                    </button>
                  </div>
                  <div className="job-item">
                    <div>
                      <div className="job-item__title">Staff Frontend Architect (React / WebGL)</div>
                      <div className="job-item__meta">UI Platform • San Francisco / Remote • Full-Time</div>
                    </div>
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() =>
                        showToast('Application link copied to clipboard!', { icon: 'check' })
                      }
                    >
                      Apply
                    </button>
                  </div>
                  <div className="job-item">
                    <div>
                      <div className="job-item__title">Product Designer (Cinematic Systems)</div>
                      <div className="job-item__meta">Design • New York / Remote • Full-Time</div>
                    </div>
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() =>
                        showToast('Application link copied to clipboard!', { icon: 'check' })
                      }
                    >
                      Apply
                    </button>
                  </div>
                </div>
                <div className="footer-modal__footer">
                  <button className="btn btn--ghost btn--sm" onClick={closeModal}>
                    Close
                  </button>
                </div>
              </>
            )}

            {/* 6. Terms of Use */}
            {activeModal === 'terms' && (
              <>
                <div className="footer-modal__header">
                  <h2 className="footer-modal__title">
                    <FileText className="footer-modal__title-icon" size={24} />
                    <span>Terms of Use</span>
                  </h2>
                  <button className="footer-modal__close" onClick={closeModal} aria-label="Close">
                    <X size={20} />
                  </button>
                </div>
                <div className="footer-modal__body">
                  <span className="footer-modal__badge">Effective as of October 2024</span>
                  <h3>1. Acceptance of Terms</h3>
                  <p>
                    By accessing or subscribing to Vybe services, you agree to be bound by these Terms of Use, our Privacy Policy,
                    and any applicable laws. If you do not agree, you must discontinue using our services.
                  </p>

                  <h3>2. Membership & Billing</h3>
                  <p>
                    Your Vybe subscription renews automatically on a monthly or annual basis until cancelled. You may cancel at any
                    time from your Account dashboard without cancellation penalties.
                  </p>

                  <h3>3. Permitted Personal Use</h3>
                  <p>
                    Vybe content and services are provided solely for personal, non-commercial entertainment. You may not broadcast,
                    publicly perform, duplicate, record, or distribute any stream without explicit prior written authorization.
                  </p>

                  <h3>4. Streaming Quality & Bandwidth</h3>
                  <p>
                    The display quality of streamed content (including 4K Ultra HD and HDR) may vary based on your device, connection
                    bandwidth, and geographical location. Standard playback requires 5 Mbps; 4K streaming requires at least 25 Mbps.
                  </p>

                  <h3>5. Account Security</h3>
                  <p>
                    You are responsible for maintaining the confidentiality of your credentials and for all activities conducted under
                    your profiles.
                  </p>
                </div>
                <div className="footer-modal__footer">
                  <button className="btn btn--primary btn--sm" onClick={closeModal}>
                    I Understand
                  </button>
                </div>
              </>
            )}

            {/* 7. Privacy */}
            {activeModal === 'privacy' && (
              <>
                <div className="footer-modal__header">
                  <h2 className="footer-modal__title">
                    <Shield className="footer-modal__title-icon" size={24} />
                    <span>Privacy Policy</span>
                  </h2>
                  <button className="footer-modal__close" onClick={closeModal} aria-label="Close">
                    <X size={20} />
                  </button>
                </div>
                <div className="footer-modal__body">
                  <span className="footer-modal__badge">GDPR & CCPA Compliant</span>
                  <h3>1. Information We Collect</h3>
                  <p>
                    We collect information you provide directly (such as your email address and profile names) and automated
                    telemetry (such as viewing progress, titles added to My List, playback diagnostics, and general location
                    derived from IP address).
                  </p>

                  <h3>2. How We Use Your Data</h3>
                  <ul>
                    <li>To provide and personalize your streaming recommendations and continue watching rows.</li>
                    <li>To authenticate your sign-in sessions securely across browsers and devices.</li>
                    <li>To monitor video buffering and prevent service abuse or security breaches.</li>
                  </ul>

                  <h3>3. Data Sharing & Security</h3>
                  <p>
                    Vybe never sells your personal information to third parties. Data is encrypted in transit via TLS 1.3 and at rest
                    using AES-256 standard encryption.
                  </p>

                  <h3>4. Your Rights</h3>
                  <p>
                    Under European GDPR and California CCPA regulations, you have the right to request a complete copy of your data or
                    request account deletion at any time from your Account settings.
                  </p>
                </div>
                <div className="footer-modal__footer">
                  <button className="btn btn--primary btn--sm" onClick={closeModal}>
                    Acknowledge
                  </button>
                </div>
              </>
            )}

            {/* 8. Legal Notices */}
            {activeModal === 'legal' && (
              <>
                <div className="footer-modal__header">
                  <h2 className="footer-modal__title">
                    <Scale className="footer-modal__title-icon" size={24} />
                    <span>Legal Notices</span>
                  </h2>
                  <button className="footer-modal__close" onClick={closeModal} aria-label="Close">
                    <X size={20} />
                  </button>
                </div>
                <div className="footer-modal__body">
                  <span className="footer-modal__badge">Intellectual Property & Disclosures</span>
                  <h3>Third-Party Attribution</h3>
                  <p>
                    This application utilizes the TMDB API but is not officially endorsed or certified by The Movie Database (TMDB).
                    All movie and TV series metadata, synopses, and promotional poster imagery are property of their respective copyright
                    holders.
                  </p>

                  <h3>Digital Millennium Copyright Act (DMCA)</h3>
                  <p>
                    Vybe respects the intellectual property rights of creators. If you believe that your copyrighted work has been infringed,
                    please send a formal DMCA notice to our designated copyright agent:
                  </p>
                  <p style={{ background: '#242424', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <strong>Vybe Legal Compliance</strong>
                    <br />
                    Attn: DMCA Copyright Agent
                    <br />
                    100 Streaming Blvd, Suite 400, Los Gatos, CA 95032
                    <br />
                    Email: <a href="mailto:dmca@vybe.tv" style={{ color: '#ff4d58' }}>dmca@vybe.tv</a>
                  </p>

                  <h3>Trademarks</h3>
                  <p>
                    "Vybe", the Vybe stylized "V" emblem, and "Stream The Mood" are registered trademarks of Vybe Entertainment Global, Inc.
                  </p>
                </div>
                <div className="footer-modal__footer">
                  <button className="btn btn--primary btn--sm" onClick={closeModal}>
                    Close
                  </button>
                </div>
              </>
            )}

            {/* 9. Cookie Preferences */}
            {activeModal === 'cookies' && (
              <>
                <div className="footer-modal__header">
                  <h2 className="footer-modal__title">
                    <Cookie className="footer-modal__title-icon" size={24} />
                    <span>Cookie Preferences</span>
                  </h2>
                  <button className="footer-modal__close" onClick={closeModal} aria-label="Close">
                    <X size={20} />
                  </button>
                </div>
                <div className="footer-modal__body">
                  <span className="footer-modal__badge">Consent Management</span>
                  <p>
                    We use cookies and local storage to power authentication, remember your subtitle settings, and analyze platform
                    performance. Manage your preferences below:
                  </p>

                  {/* Essential */}
                  <div className="cookie-card">
                    <div className="cookie-card__header">
                      <span className="cookie-card__title">Strictly Necessary Cookies</span>
                      <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>Always Active</span>
                    </div>
                    <p className="cookie-card__desc">
                      Required for account authentication, security validation, and session persistence. These cannot be disabled.
                    </p>
                  </div>

                  {/* Functional */}
                  <div className="cookie-card">
                    <div className="cookie-card__header">
                      <span className="cookie-card__title">Functional Preferences</span>
                      <label className="cookie-switch">
                        <input
                          type="checkbox"
                          checked={cookieConsent.functional}
                          onChange={(e) =>
                            setCookieConsent({ ...cookieConsent, functional: e.target.checked })
                          }
                        />
                        <span className="cookie-slider" />
                      </label>
                    </div>
                    <p className="cookie-card__desc">
                      Remembers volume levels, language preferences, and active viewing profile choices.
                    </p>
                  </div>

                  {/* Analytics */}
                  <div className="cookie-card">
                    <div className="cookie-card__header">
                      <span className="cookie-card__title">Performance & Analytics</span>
                      <label className="cookie-switch">
                        <input
                          type="checkbox"
                          checked={cookieConsent.analytics}
                          onChange={(e) =>
                            setCookieConsent({ ...cookieConsent, analytics: e.target.checked })
                          }
                        />
                        <span className="cookie-slider" />
                      </label>
                    </div>
                    <p className="cookie-card__desc">
                      Helps us monitor stream buffering health, playback errors, and page load speed.
                    </p>
                  </div>

                  {/* Marketing */}
                  <div className="cookie-card">
                    <div className="cookie-card__header">
                      <span className="cookie-card__title">Personalized Recommendations</span>
                      <label className="cookie-switch">
                        <input
                          type="checkbox"
                          checked={cookieConsent.marketing}
                          onChange={(e) =>
                            setCookieConsent({ ...cookieConsent, marketing: e.target.checked })
                          }
                        />
                        <span className="cookie-slider" />
                      </label>
                    </div>
                    <p className="cookie-card__desc">
                      Permits cross-genre algorithmic discovery tailored to your viewing patterns.
                    </p>
                  </div>
                </div>
                <div className="footer-modal__footer">
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setCookieConsent({ functional: true, analytics: true, marketing: true });
                      showToast('Accepted all cookies.', { icon: 'check' });
                      closeModal();
                    }}
                  >
                    Accept All
                  </button>
                  <button className="btn btn--primary btn--sm" onClick={handleSaveCookies}>
                    Save Preferences
                  </button>
                </div>
              </>
            )}

            {/* 10. Corporate Information */}
            {activeModal === 'corporate' && (
              <>
                <div className="footer-modal__header">
                  <h2 className="footer-modal__title">
                    <Building2 className="footer-modal__title-icon" size={24} />
                    <span>Corporate Information</span>
                  </h2>
                  <button className="footer-modal__close" onClick={closeModal} aria-label="Close">
                    <X size={20} />
                  </button>
                </div>
                <div className="footer-modal__body">
                  <span className="footer-modal__badge">Company Details</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                    <div className="contact-card">
                      <div className="contact-card__label">Legal Entity</div>
                      <div className="contact-card__value">Vybe Entertainment Global, Inc.</div>
                    </div>
                    <div className="contact-card">
                      <div className="contact-card__label">Jurisdiction</div>
                      <div className="contact-card__value">Delaware, USA (Reg #89214710)</div>
                    </div>
                    <div className="contact-card">
                      <div className="contact-card__label">Global Headquarters</div>
                      <div className="contact-card__value">100 Streaming Blvd, Los Gatos, CA 95032</div>
                    </div>
                    <div className="contact-card">
                      <div className="contact-card__label">VAT Registration</div>
                      <div className="contact-card__value">EU-824910248</div>
                    </div>
                  </div>

                  <h3 style={{ marginTop: '1.5rem' }}>Executive Officers</h3>
                  <ul>
                    <li><strong>Chief Executive Officer:</strong> Alex Vance</li>
                    <li><strong>Chief Technology Officer:</strong> Sarah Jenkins</li>
                    <li><strong>Chief Content Officer:</strong> Marcus Reynolds</li>
                  </ul>

                  <h3>Hosting & Cloud Infrastructure</h3>
                  <p>
                    Distributed across Google Cloud Platform and Cloudflare edge networks with 99.98% guaranteed SLA availability.
                  </p>
                </div>
                <div className="footer-modal__footer">
                  <button className="btn btn--primary btn--sm" onClick={closeModal}>
                    Close
                  </button>
                </div>
              </>
            )}

            {/* 11. Contact Us */}
            {activeModal === 'contact' && (
              <>
                <div className="footer-modal__header">
                  <h2 className="footer-modal__title">
                    <Mail className="footer-modal__title-icon" size={24} />
                    <span>Contact Us</span>
                  </h2>
                  <button className="footer-modal__close" onClick={closeModal} aria-label="Close">
                    <X size={20} />
                  </button>
                </div>
                <div className="footer-modal__body">
                  <span className="footer-modal__badge">Customer Care Team</span>

                  <div className="contact-grid">
                    <div className="contact-card">
                      <MessageSquare className="contact-card__icon" size={24} />
                      <div className="contact-card__label">Live Chat</div>
                      <div className="contact-card__value">24/7 Available (Avg. 45s)</div>
                    </div>
                    <div className="contact-card">
                      <Phone className="contact-card__icon" size={24} />
                      <div className="contact-card__label">Call Toll-Free</div>
                      <div className="contact-card__value">1-800-892-VYBE</div>
                    </div>
                    <div className="contact-card">
                      <HelpCircle className="contact-card__icon" size={24} />
                      <div className="contact-card__label">Help Center</div>
                      <Link to="/help" onClick={closeModal} style={{ color: '#ff4d58', fontSize: '0.8rem' }}>
                        Browse FAQs &rarr;
                      </Link>
                    </div>
                  </div>

                  <h3>Send a Support Ticket</h3>
                  <form onSubmit={handleContactSubmit}>
                    <div className="footer-modal__row">
                      <input
                        type="text"
                        className="footer-modal__input"
                        placeholder="Your Full Name"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        required
                      />
                      <input
                        type="email"
                        className="footer-modal__input"
                        placeholder="Your Email Address"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        required
                      />
                    </div>

                    <select
                      className="footer-modal__select"
                      value={contactForm.topic}
                      onChange={(e) => setContactForm({ ...contactForm, topic: e.target.value })}
                    >
                      <option value="Streaming & Video Quality">Streaming & Video Quality</option>
                      <option value="Account & Profiles">Account & Profiles</option>
                      <option value="Billing & Membership">Billing & Membership</option>
                      <option value="Feature Suggestion">Feature Suggestion</option>
                      <option value="Report a Bug">Report a Bug</option>
                    </select>

                    <textarea
                      rows={4}
                      className="footer-modal__textarea"
                      placeholder="Describe what you need help with..."
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      required
                    />

                    <button
                      type="submit"
                      className="btn btn--primary btn--sm"
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      disabled={contactSubmitted}
                    >
                      {contactSubmitted ? (
                        <>
                          <Check size={16} /> Ticket Created!
                        </>
                      ) : (
                        <>
                          <Send size={16} /> Submit Support Request
                        </>
                      )}
                    </button>
                  </form>
                </div>
                <div className="footer-modal__footer">
                  <button className="btn btn--ghost btn--sm" onClick={closeModal}>
                    Cancel
                  </button>
                </div>
              </>
            )}

          </div>
        )}
        </div>
      )}
    </footer>
  );
}
