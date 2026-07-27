import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

if (import.meta.env.VITE_MOCK_TAURI === 'true') {
  import('./mocks/tauri').then(({ setupTauriMocks }) => {
    setupTauriMocks();
    mountApp();
  });
} else {
  mountApp();
}

function mountApp() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
