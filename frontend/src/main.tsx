import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initAdBlocker } from './utils/adblock'
import './index.css'

// Automatically handle Vite dynamic import / stale chunk fetch errors on new deployments
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const lastReload = window.sessionStorage.getItem('vybe_preload_reload');
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    window.sessionStorage.setItem('vybe_preload_reload', now.toString());
    window.location.reload();
  }
});

// Initialize ad, popup, and redirect shield
initAdBlocker()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

