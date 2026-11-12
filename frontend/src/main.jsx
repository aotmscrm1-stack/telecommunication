import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './theme.css'
import './index.css'

// This app ships no service worker of its own. An older deploy registered a
// Workbox worker that is still controlling this origin in some browsers, which
// logs to the console and can serve stale assets. Unregister it (and drop its
// precache entries) on every load so the console stays clean and the browser
// always runs the current build.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => {})

    if (window.caches) {
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => /workbox|precache|runtime|sw-|pwa/i.test(key))
              .map((key) => caches.delete(key))
          )
        )
        .catch(() => {})
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
