import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './design/fonts';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerSW({ immediate: true });
