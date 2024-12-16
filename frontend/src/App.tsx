import React, { useState, useEffect } from 'react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import RecordingPage from './pages/RecordingPage';
import PlaybackPage from './pages/PlaybackPage';
import SettingsPage from './pages/SettingsPage';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    return (
      localStorage.getItem('themeMode') as 'light' | 'dark' ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    );
  });

  const [nonce, setNonce] = useState<string | null>(null);

  useEffect(() => {
    // Check if running in a browser environment
    if (typeof document !== 'undefined') {
      const nonceValue = document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content') || null;
      setNonce(nonceValue);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  const theme = createTheme({
    palette: {
      mode: themeMode,
      primary: { main: '#1976d2' },
      secondary: { main: '#ff4081' },
    },
    typography: {
      fontFamily: '"Roboto", "Arial", sans-serif',
    },
  });

  // Only create Emotion cache if nonce is available
  const cache = createCache({
    key: 'css',
    nonce: nonce || undefined, // Fallback to undefined if nonce is not available
  });

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary>
          <Router>
            <Header />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/recording" element={<RecordingPage />} />
              <Route path="/playback" element={<PlaybackPage />} />
              <Route
                path="/settings"
                element={<SettingsPage themeMode={themeMode} setThemeMode={setThemeMode} />}
              />
            </Routes>
          </Router>
        </ErrorBoundary>
      </ThemeProvider>
    </CacheProvider>
  );
};

export default App;
