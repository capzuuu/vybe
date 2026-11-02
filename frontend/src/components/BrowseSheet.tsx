import React, { useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { X, Flame, Users, Globe, ChevronRight, Menu } from 'lucide-react';
import { useLockBodyScroll, useOnClickOutside } from '../hooks';
import './browseSheet.css';

interface BrowseSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BrowseSheet({ isOpen, onClose }: BrowseSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useLockBodyScroll(isOpen);
  useOnClickOutside(sheetRef, onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div className="browse-sheet-backdrop" aria-modal="true" role="dialog">
      <div ref={sheetRef} className="browse-sheet">
        {/* Pull Handle Indicator */}
        <div className="browse-sheet__handle-bar">
          <div className="browse-sheet__handle" />
        </div>

        {/* Header */}
        <div className="browse-sheet__header">
          <div className="browse-sheet__title">
            <Menu size={20} color="#e50914" />
            <span>More</span>
          </div>
          <button
            type="button"
            className="browse-sheet__close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Buttons matching Navbar style */}
        <div className="more-sheet-nav">
          <NavLink
            to="/latest"
            className={({ isActive }) => `more-nav-btn ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="more-nav-btn__left">
              <div className="more-nav-btn__icon">
                <Flame size={20} />
              </div>
              <span className="more-nav-btn__label">New &amp; Hot</span>
            </div>
            <ChevronRight size={18} className="more-nav-btn__arrow" />
          </NavLink>

          <NavLink
            to="/community"
            className={({ isActive }) => `more-nav-btn ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="more-nav-btn__left">
              <div className="more-nav-btn__icon">
                <Users size={20} />
              </div>
              <span className="more-nav-btn__label">Community</span>
            </div>
            <ChevronRight size={18} className="more-nav-btn__arrow" />
          </NavLink>

          <NavLink
            to="/browse/languages"
            className={({ isActive }) => `more-nav-btn ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="more-nav-btn__left">
              <div className="more-nav-btn__icon">
                <Globe size={20} />
              </div>
              <span className="more-nav-btn__label">Browse by Languages</span>
            </div>
            <ChevronRight size={18} className="more-nav-btn__arrow" />
          </NavLink>
        </div>
      </div>
    </div>
  );
}
