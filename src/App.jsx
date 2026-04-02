import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import LogoutIcon from '@mui/icons-material/Logout';
import { createTheme, responsiveFontSizes, ThemeProvider } from '@mui/material/styles';
import Login from './Login';
import EvaluationForm from './EvaluationForm';
import uaLogo from './assets/UA-Logo.png';

const AdminDashboard = lazy(() => import('./AdminDashboard'));
const FacultyDashboard = lazy(() => import('./FacultyDashboard'));

const brandColors = {
  primary: '#0c4a8a',
  secondary: '#d97706',
  success: '#0f766e',
  error: '#dc2626',
  warning: '#b45309',
  info: '#0369a1',
  background: 'linear-gradient(135deg, #f3f7fb 0%, #e2e8f0 100%)', // UPDATED: Modern Gradient
  backgroundAlt: '#eef3f9',
  paper: '#ffffff',
  border: 'rgba(226, 232, 240, 0.8)', // UPDATED: Softer border for glass effect
  textPrimary: '#102a43',
  textSecondary: '#486581',
  muted: '#64748b',
};

// NEW: Glassmorphism Style Constant
export const glassStyle = {
  background: 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.05)',
};

const baseTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: brandColors.primary },
    secondary: { main: brandColors.secondary },
    success: { main: brandColors.success },
    error: { main: brandColors.error },
    warning: { main: brandColors.warning },
    info: { main: brandColors.info },
    background: { default: '#f3f7fb', paper: brandColors.paper },
    divider: brandColors.border,
    text: { primary: brandColors.textPrimary, secondary: brandColors.textSecondary },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
    h1: { fontSize: '3rem', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.2 },
    h3: { fontSize: '2rem', fontWeight: 800, lineHeight: 1.2 },
    h4: { fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontSize: '1.5rem', fontWeight: 750 },
    h6: { fontSize: '1.25rem', fontWeight: 700 },
    body1: { fontSize: '1rem', lineHeight: 1.6 },
    body2: { fontSize: '0.9rem', lineHeight: 1.5, color: brandColors.textSecondary },
    button: { fontWeight: 700, textTransform: 'none' },
    caption: { fontSize: '0.75rem', color: brandColors.muted },
    overline: { fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' },
  },
  spacing: 8,
  shape: { borderRadius: 16 }, // UPDATED: Slightly rounder corners
  shadows: [
    'none',
    '0 1px 2px rgba(15, 23, 42, 0.08)',
    '0 2px 4px rgba(15, 23, 42, 0.08)',
    '0 6px 12px rgba(15, 23, 42, 0.09)',
    '0 10px 20px rgba(15, 23, 42, 0.10)',
    '0 14px 28px rgba(15, 23, 42, 0.10)',
    '0 16px 32px rgba(15, 23, 42, 0.10)',
    '0 18px 34px rgba(15, 23, 42, 0.11)',
    '0 20px 36px rgba(15, 23, 42, 0.11)',
    '0 22px 38px rgba(15, 23, 42, 0.11)',
    '0 24px 40px rgba(15, 23, 42, 0.12)',
    '0 26px 42px rgba(15, 23, 42, 0.12)',
    '0 28px 44px rgba(15, 23, 42, 0.12)',
    '0 30px 46px rgba(15, 23, 42, 0.12)',
    '0 32px 48px rgba(15, 23, 42, 0.13)',
    '0 34px 50px rgba(15, 23, 42, 0.13)',
    '0 36px 52px rgba(15, 23, 42, 0.13)',
    '0 38px 54px rgba(15, 23, 42, 0.13)',
    '0 40px 56px rgba(15, 23, 42, 0.14)',
    '0 42px 58px rgba(15, 23, 42, 0.14)',
    '0 44px 60px rgba(15, 23, 42, 0.14)',
    '0 46px 62px rgba(15, 23, 42, 0.14)',
    '0 48px 64px rgba(15, 23, 42, 0.15)',
    '0 50px 66px rgba(15, 23, 42, 0.15)',
    '0 52px 68px rgba(15, 23, 42, 0.15)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: brandColors.background, // Applies the gradient
          backgroundAttachment: 'fixed',
          color: brandColors.textPrimary,
          margin: 0,
          fontSmooth: 'antialiased',
        },
        '*:focus-visible': {
          outline: `3px solid ${brandColors.secondary}`,
          outlineOffset: 2,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: `1px solid ${brandColors.border}`,
          boxShadow: '0 16px 32px rgba(15, 23, 42, 0.08)',
          borderRadius: 16,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 700,
          transition: 'transform 140ms ease, box-shadow 140ms ease, background-color 140ms ease',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        containedPrimary: {
          backgroundColor: brandColors.primary,
          '&:hover': { backgroundColor: '#0a3d73' },
        },
        outlined: {
          borderWidth: 1.5,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: brandColors.paper,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#cbd5e1',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: brandColors.primary,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 2,
            borderColor: brandColors.primary,
          },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            borderColor: brandColors.error,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 700,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${brandColors.border}`,
          boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
        },
      },
    },
  },
});

const appTheme = responsiveFontSizes(baseTheme);

const createEmptySession = () => ({ role: null, email: '', token: '', avatar: '' });

const getStoredSession = () => {
  if (typeof window === 'undefined') {
    return createEmptySession();
  }
  const stored = window.sessionStorage.getItem('citEvalSession');
  if (!stored) return createEmptySession();
  try {
    return JSON.parse(stored);
  } catch {
    return createEmptySession();
  }
};

const App = () => {
  const [session, setSession] = useState(() => getStoredSession());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (session.role) {
      window.sessionStorage.setItem('citEvalSession', JSON.stringify(session));
    } else {
      window.sessionStorage.removeItem('citEvalSession');
    }
  }, [session]);

  const handleLogin = useCallback((role, email, token, avatar) => {
    if (typeof window !== 'undefined' && role !== 'ADMIN') {
      window.sessionStorage.removeItem('adminToken');
    }
    setSession({ role, email, token: token || '', avatar: avatar || '' });
  }, []);

  const handleLogout = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('adminToken');
    }
    setSession(createEmptySession());
  }, []);

  const renderContent = () => {
    switch (session.role) {
      case 'ADMIN':
        return <AdminDashboard adminToken={session.token} />;
      case 'FACULTY':
        return <FacultyDashboard facultyEmail={session.email} facultyAvatar={session.avatar} />;
      case 'STUDENT':
        return <EvaluationForm studentEmail={session.email} onSubmitted={handleLogout} />;
      default:
        return <Login onLogin={handleLogin} />;
    }
  };

  const suspenseFallback = (
    <Paper sx={{ ...glassStyle, p: 4, textAlign: 'center' }}>
      <CircularProgress size={28} />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
        Loading dashboard...
      </Typography>
    </Paper>
  );

  const sessionTitle =
    {
      ADMIN: 'Administrator Control Center',
      FACULTY: 'Faculty Portal',
      STUDENT: 'Student Evaluation Hub',
    }[session.role] ?? 'CIT Evaluation';

  const isAuthenticated = Boolean(session.role);
  const sessionAvatar = session.role === 'FACULTY' && !session.avatar ? uaLogo : session.avatar;

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', py: { xs: 2, md: 4 } }}>
        {isAuthenticated ? (
          <>
            <Container maxWidth="lg">
              <Paper
                elevation={0}
                sx={{
                  ...glassStyle, // UPDATED: Applied Glassmorphism
                  mb: 3,
                  p: { xs: 3, md: 4 },
                  borderRadius: 4,
                  // Added a subtle gradient overlay to the glass for brand feel
                  backgroundImage: 'linear-gradient(138deg, rgba(12, 74, 138, 0.08), rgba(217, 119, 6, 0.05))',
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar src={sessionAvatar} sx={{ bgcolor: 'primary.main', width: 56, height: 56, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      {(session.email && session.email[0]?.toUpperCase()) || session.role?.charAt(0) || 'C'}
                    </Avatar>
                    <Box>
                      <Box
                        component="img"
                        src={uaLogo}
                        alt="UA logo"
                        sx={{ height: 26, mb: 0.5, display: 'block' }}
                      />
                      <Typography variant="overline" color="text.secondary" letterSpacing={1.2}>
                        Active Session
                      </Typography>
                      <Typography variant="h5" fontWeight={800} color="primary.main">
                        {sessionTitle}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.85 }}>
                        {session.email || 'No email provided'}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Chip label={session.role} variant="outlined" color="secondary" sx={{ fontWeight: 700, bgcolor: 'rgba(217, 119, 6, 0.05)' }} />
                    <Tooltip title="Sign out">
                      <IconButton onClick={handleLogout} size="large" sx={{ bgcolor: 'white', '&:hover': { bgcolor: '#fee2e2' } }}>
                        <LogoutIcon color="error" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Paper>
            </Container>
            <Container maxWidth="lg">
              <Suspense fallback={suspenseFallback}>{renderContent()}</Suspense>
            </Container>
          </>
        ) : (
          <Box>
            <Suspense fallback={suspenseFallback}>{renderContent()}</Suspense>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default App;