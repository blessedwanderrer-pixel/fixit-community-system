import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './auth/AuthContext.tsx';
import { FeedbackProvider } from './ui/FeedbackContext.tsx';

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <FeedbackProvider>
      <App />
    </FeedbackProvider>
  </AuthProvider>,
);
