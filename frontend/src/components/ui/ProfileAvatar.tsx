import { AVATARS } from '../../data/profiles';
import './ui.css';

interface ProfileAvatarProps {
  avatar: number;
  size?: number | string;
  className?: string;
  label?: string;
}

/** Original geometric avatar artwork – coloured tile with a simple face. */
export function ProfileAvatar({ avatar, size = 32, className = '', label }: ProfileAvatarProps) {
  const a = AVATARS[avatar % AVATARS.length];
  const dim = typeof size === 'number' ? `${size}px` : size;
  return (
    <span className={`avatar ${className}`} style={{ width: dim, height: dim, background: a.bg }} role={label ? 'img' : undefined} aria-label={label}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        {a.face === 'cool' ? (
          <rect x="22" y="34" width="56" height="13" rx="6" fill={a.fg} />
        ) : a.face === 'wink' ? (
          <>
            <circle cx="33" cy="40" r="6.5" fill={a.fg} />
            <path d="M60 41 h14" stroke={a.fg} strokeWidth="6" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="33" cy="40" r="6.5" fill={a.fg} />
            <circle cx="67" cy="40" r="6.5" fill={a.fg} />
          </>
        )}
        {a.face === 'grin' ? (
          <path d="M28 60 Q50 84 72 60 Z" fill={a.fg} />
        ) : (
          <path d="M28 62 Q50 80 72 62" stroke={a.fg} strokeWidth="6" fill="none" strokeLinecap="round" />
        )}
      </svg>
    </span>
  );
}

