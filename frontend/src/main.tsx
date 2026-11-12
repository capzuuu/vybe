import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initAdBlocker } from './utils/adblock'
import { initCapacitor } from './utils/capacitor'
import './index.css'

// Non-blocking Google Fonts injection (avoids render-blocking CSS in <head> and inline JS handlers)
const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Cinzel:wght@700&family=Inter:wght@400;500;600;700;800;900&family=Orbitron:wght@800&family=Permanent+Marker&family=Playfair+Display:ital,wght@1,900&family=Righteous&display=swap';
if (typeof document !== 'undefined' && !document.querySelector('link[data-vybe-fonts]')) {
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = GOOGLE_FONTS_URL;
  fontLink.setAttribute('data-vybe-fonts', '1');
  document.head.appendChild(fontLink);
}

// Automatically handle Vite dynamic import / stale chunk fetch errors on new deployments
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  try {
    const lastReload = window.sessionStorage.getItem('vybe_preload_reload');
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      window.sessionStorage.setItem('vybe_preload_reload', now.toString());
      window.location.reload();
    }
  } catch {
    window.location.reload();
  }
});

// Initialize ad, popup, and redirect shield
initAdBlocker()

// Initialize Capacitor native mobile bridge (no-op on web)
initCapacitor()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

