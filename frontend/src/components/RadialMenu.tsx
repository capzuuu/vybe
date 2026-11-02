import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Flame, Users, Globe } from 'lucide-react';
import './radialMenu.css';

interface RadialMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const RADIAL_ITEMS = [
  {
    path: '/latest',
    label: 'New & Hot',
    icon: Flame,
    color: '#e50914',
  },
  {
    path: '/community',
    label: 'Community',
    icon: Users,
    color: '#3b82f6',
  },
  {
    path: '/browse/languages',
    label: 'Languages',
    icon: Globe,
    color: '#10b981',
  },
];

export function RadialMenu({ isOpen, onClose }: RadialMenuProps) {
  const location = useLocation();

  // Close radial menu on location change
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Blurred Backdrop */}
      <div
        className={`radial-menu-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Radial Nodes */}
      <div className={`radial-menu-container ${isOpen ? 'open' : ''}`} role="menu">
        {RADIAL_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.path} className="radial-item-wrapper">
              <span className="radial-item__label">{item.label}</span>
              <NavLink
                to={item.path}
                className={({ isActive }) => `radial-item__btn ${isActive ? 'active' : ''}`}
                onClick={onClose}
                aria-label={item.label}
              >
                <Icon size={20} />
              </NavLink>
            </div>
          );
        })}
      </div>
    </>
  );
}

