import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

if (import.meta.env.VITE_MOCK_TAURI === 'true') {
  const { setupTauriMocks } = await import('./mocks/tauri');
  setupTauriMocks();
}

const { default: App } = await import('./App.tsx');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
