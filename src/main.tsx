import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { LanguageProvider } from './contexts/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Register service worker for PWA offline support
const updateSW = registerSW({
  onNeedRefresh() {
    // We can't use the hook here easily, so we fallback to reading localStorage directly
    const lang = localStorage.getItem('app_language') || 'en';
    const msg = lang === 'zh' ? '有新内容可用。是否重新加载？' : 'New content available. Reload?';
    if (confirm(msg)) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    const lang = localStorage.getItem('app_language') || 'en';
    const msg = lang === 'zh' ? '应用已准备好离线工作' : 'App is ready to work offline';
    console.log(msg);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
);
