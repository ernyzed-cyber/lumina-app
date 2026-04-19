import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { NotificationsProvider } from './hooks/useNotifications';
import { MyProfileProvider } from './hooks/useMyProfile';
import { LanguageProvider } from './i18n';
import App from './App';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <MyProfileProvider>
              <NotificationsProvider>
                <App />
              </NotificationsProvider>
            </MyProfileProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
