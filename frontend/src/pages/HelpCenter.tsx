import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import {
  Search,
  X,
  ChevronDown,
  KeyRound,
  Users,
  CreditCard,
  Film,
  MessageSquare,
  Phone,
  ShieldCheck,
  Tv,
} from 'lucide-react';
import './helpCenter.css';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string | React.ReactNode;
}

const FAQS: FAQItem[] = [
  {
    id: 'cancel-plan',
    category: 'Billing & Membership',
    question: 'How do I cancel or modify my subscription plan?',
    answer: (
      <div>
        <p>You can cancel or change your plan at any time with no cancellation fees:</p>
        <ul>
          <li>Go to your <strong>Account</strong> page from the top-right profile menu.</li>
          <li>Under <strong>Plan Details</strong>, click on <strong>Change Plan</strong> or view your active plan options.</li>
          <li>If you choose to cancel, your access will continue until the end of your current billing period.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'downloads',
    category: 'Watching & Features',
    question: 'How do I download movies and TV shows to watch offline?',
    answer: (
      <div>
        <p>Offline downloads are included with your Vybe subscription:</p>
        <ul>
          <li>Open any movie or TV series details modal.</li>
          <li>Click the <strong>Download</strong> icon next to the Play button (or next to each individual episode).</li>
          <li>Access your downloaded content under <strong>My Downloads</strong> to watch without an internet connection.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'buffering',
    category: 'Troubleshooting',
    question: 'What should I do if a video is buffering or fails to load?',
    answer: (
      <div>
        <p>If playback is freezing, buffering, or displaying an error:</p>
        <ul>
          <li>Check your internet connection speed (we recommend at least 15 Mbps for 4K Ultra HD streaming).</li>
          <li>Restart your browser or reload the playback page.</li>
          <li>Ensure hardware acceleration is enabled in your browser settings.</li>
          <li>Disable aggressive ad-blockers or VPN extensions that may interrupt video stream data.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'subtitles',
    category: 'Watching & Features',
    question: 'How do I enable subtitles, closed captions, or alternate audio?',
    answer: (
      <div>
        <p>While watching any movie or episode in the Vybe video player:</p>
        <ul>
          <li>Move your mouse to reveal player controls and click the <strong>Audio & Subtitles</strong> speech bubble icon at the bottom right.</li>
          <li>Select your preferred audio language (e.g. English [Original], Spanish, French, German).</li>
          <li>Choose your subtitle language or select <strong>Off</strong> to disable captions.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'kids-maturity',
    category: 'Profiles & Parental Controls',
    question: 'How do I configure Kids profiles and maturity restrictions?',
    answer: (
      <div>
        <p>Vybe makes it easy to maintain a safe, age-appropriate experience for your family:</p>
        <ul>
          <li>Go to <strong>Manage Profiles</strong> (`/profiles`) from the profile menu.</li>
          <li>Click on the pencil icon over any profile you wish to adjust.</li>
          <li>Toggle the <strong>Kid?</strong> checkbox to restrict the profile to TV-Y, TV-G, and PG titles only.</li>
          <li>Save changes to immediately update recommendations for that profile.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'devices',
    category: 'Watching & Features',
    question: 'Which devices, smart TVs, and browsers are supported?',
    answer: (
      <div>
        <p>Vybe is optimized across all modern platforms:</p>
        <ul>
          <li><strong>Web Browsers:</strong> Google Chrome, Mozilla Firefox, Microsoft Edge, and Apple Safari.</li>
          <li><strong>Mobile Devices:</strong> iOS (iPhone & iPad) and Android smartphones & tablets.</li>
          <li><strong>TVs & Consoles:</strong> Apple TV, Android TV, Google TV, Samsung Smart TVs, LG webOS, PlayStation, and Xbox.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'change-password',
    category: 'Account & Security',
    question: 'How do I update my email address or change my password?',
    answer: (
      <div>
        <p>To keep your account secure:</p>
        <ul>
          <li>Visit your <strong>Account</strong> page.</li>
          <li>Under <strong>Membership & Billing</strong>, click <strong>Change password</strong>.</li>
          <li>Enter your new password (at least 6 characters) and click <strong>Update Password</strong>.</li>
        </ul>
      </div>
    ),
  },
  {
    id: '4k-hdr',
    category: 'Watching & Features',
    question: 'What video resolution and audio standards does Vybe support?',
    answer: (
      <div>
        <p>Depending on your display and title availability, Vybe delivers:</p>
        <ul>
          <li><strong>Ultra HD (4K):</strong> 3840 x 2160 pixels with high-bitrate streaming.</li>
          <li><strong>HDR & Dolby Vision:</strong> Enhanced dynamic range, deeper contrast, and richer colors.</li>
          <li><strong>Spatial Audio:</strong> Immersive cinema sound compatible with any stereo headphones or multi-channel surround sound system.</li>
        </ul>
      </div>
    ),
  },
];

export function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(FAQS[0].id);
  const { showToast } = useToast();

  const toggleAccordion = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleLiveChat = () => {
    showToast('Connecting to 24/7 Live Support Agent... Estimated wait: 1 minute.', {
      icon: 'info',
    });
  };

  const handleCallUs = () => {
    const code = Math.floor(100000 + Math.random() * 900000);
    showToast(`Call toll-free: 1-800-892-3892 • Your Service Code: ${code}`, {
      icon: 'info',
    });
  };

  const handleTitleRequest = () => {
    showToast('Thank you! Your title suggestion has been submitted to the content team.', {
      icon: 'check',
    });
  };

  return (
    <div className="help-page">
      {/* Hero Search Section */}
      <section className="help-hero">
        <div className="help-hero__inner">
          <h1 className="help-hero__title">Help Center</h1>
          <p className="help-hero__subtitle">
            What can we help you with today? Find answers, manage your account, or contact support.
          </p>

          <div className="help-search-box">
            <Search size={20} />
            <input
              type="text"
              className="help-search-input"
              placeholder="Search topics, questions, or keywords (e.g. cancel, downloads, 4K)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search help topics"
            />
            {searchQuery && (
              <button
                type="button"
                className="help-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="help-content">
        {/* Quick Self-Service Action Cards */}
        <div className="help-quick-grid">
          <Link to="/account" className="help-quick-card">
            <div className="help-quick-icon">
              <KeyRound size={22} />
            </div>
            <span className="help-quick-title">Reset Password</span>
            <span className="help-quick-desc">
              Change your password or update your login credentials securely.
            </span>
          </Link>

          <Link to="/account" className="help-quick-card">
            <div className="help-quick-icon">
              <CreditCard size={22} />
            </div>
            <span className="help-quick-title">Billing & Plans</span>
            <span className="help-quick-desc">
              View your billing cycle, payment method, or switch streaming plans.
            </span>
          </Link>

          <Link to="/profiles" className="help-quick-card">
            <div className="help-quick-icon">
              <Users size={22} />
            </div>
            <span className="help-quick-title">Manage Profiles</span>
            <span className="help-quick-desc">
              Create, edit, or adjust maturity ratings and Kids locks.
            </span>
          </Link>

          <div className="help-quick-card" onClick={handleTitleRequest}>
            <div className="help-quick-icon">
              <Film size={22} />
            </div>
            <span className="help-quick-title">Request Titles</span>
            <span className="help-quick-desc">
              Suggest movies or TV series you would love to see on Vybe.
            </span>
          </div>
        </div>

        {/* FAQs Accordion */}
        <section aria-labelledby="faq-title">
          <h2 id="faq-title" className="help-categories-title">
            {searchQuery.trim()
              ? `Search Results (${filteredFaqs.length})`
              : 'Frequently Asked Questions'}
          </h2>

          {filteredFaqs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--c-text-muted)' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No results found for "{searchQuery}"</p>
              <p style={{ fontSize: '0.9rem' }}>Try searching with different keywords or contact 24/7 support below.</p>
            </div>
          ) : (
            <div className="help-accordion-list">
              {filteredFaqs.map((faq) => {
                const isOpen = expandedId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className={`help-accordion-item ${isOpen ? 'open' : ''}`}
                  >
                    <button
                      type="button"
                      className="help-accordion-header"
                      onClick={() => toggleAccordion(faq.id)}
                      aria-expanded={isOpen}
                    >
                      <span>{faq.question}</span>
                      <ChevronDown size={18} />
                    </button>
                    {isOpen && (
                      <div className="help-accordion-body">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Still Need Help / 24/7 Support Banner */}
        <section className="help-contact-banner">
          <div className="help-contact-left">
            <h3 className="help-contact-title">Still need help?</h3>
            <p className="help-contact-desc">
              Our customer service team is available 24/7 to help you resolve any questions or issues with your account or streaming.
            </p>
          </div>

          <div className="help-contact-actions">
            <button
              type="button"
              className="btn-contact btn-contact--primary"
              onClick={handleLiveChat}
            >
              <MessageSquare size={17} />
              <span>Start Live Chat</span>
            </button>
            <button
              type="button"
              className="btn-contact btn-contact--secondary"
              onClick={handleCallUs}
            >
              <Phone size={17} />
              <span>Call Us</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

