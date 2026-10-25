import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './auth/AuthContext.tsx';
import { FeedbackProvider } from './ui/FeedbackContext.tsx';
import { I18nProvider } from './i18n/I18nContext.tsx';

createRoot(document.getElementById('root')!).render(
  <I18nProvider>
    <AuthProvider>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </AuthProvider>
  </I18nProvider>,
);
