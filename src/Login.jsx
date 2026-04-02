import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import {
  Container, Paper, Typography, Box, Divider,
  TextField, Button, Alert, Stack, Chip, Fade, Zoom
} from '@mui/material';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import SchoolIcon from '@mui/icons-material/School';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { apiClient } from './shared/api/client';
import uaLogo from './assets/UA-Logo.png';

// Import mo dito ang image mo mula sa assets
import campusBgImage from './assets/uaCampus.jpg'; 

const Login = ({ onLogin }) => {
  const [adminView, setAdminView] = useState(false);
  const [adminCreds, setAdminCreds] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const expectedGoogleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

  const handleGoogleSuccess = async (googleResponse) => {
    try {
      await apiClient.post('/api/public/sync-user', {
        idToken: googleResponse.credential 
      });
      return true;
    } catch (err) {
      console.error("Profile sync failed, but proceeding with login session.", err);
      return true;
    }
  };

  const onSuccess = async (res) => {
    try {
      const decoded = jwtDecode(res.credential);
      if (!decoded?.email || decoded.email_verified !== true) {
        setError('Google account is not verified. Please use a verified UA account.');
        return;
      }
      if (!decoded.email.endsWith('@ua.edu.ph')) {
        setError('Unauthorized: Please use your official @ua.edu.ph Google account.');
        return;
      }
      await handleGoogleSuccess(res);
      const isFaculty = decoded.email.startsWith('faculty.') || decoded.email.startsWith('prof.');
      const role = isFaculty ? 'FACULTY' : 'STUDENT';
      onLogin(role, decoded.email, null, decoded.picture);
    } catch (_err) {
      setError('Google authentication failed. Please try again.');
    }
  };

  const handleAdminAuth = async () => {
    if (!adminCreds.username || !adminCreds.password) {
      setError("Please enter both username and password.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post('/api/auth/admin-login', {
        username: adminCreds.username,
        password: adminCreds.password
      });
      const token = res.data.token;
      sessionStorage.setItem('adminToken', token); 
      onLogin('ADMIN', 'admin@system', token);
    } catch (err) {
      sessionStorage.removeItem('adminToken');
      if (err.response && err.response.status === 401) {
        setError("Invalid credentials. Access denied.");
      } else {
        setError("Server connection failed. Is Spring Boot running?");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: `url(${campusBgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.12, // Konting adjustment sa transparency para mas professional
          zIndex: -1,
        }
      }}
    >
      <Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 } }}>
        <Paper
          elevation={6}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 4,
            textAlign: 'center',
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
            background: 'rgba(255, 255, 255, 0.92)', // Semi-transparent white
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}
        >
          <Box
            component="img"
            src={uaLogo}
            alt="University of the Assumption logo"
            sx={{ height: { xs: 48, sm: 64 }, width: 'auto', mb: 2 }}
          />

          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={1} 
            justifyContent="center" 
            sx={{ mb: 2 }}
          >
            <Chip icon={<SchoolIcon />} label="UA College of IT" color="primary" variant="outlined" />
            <Chip icon={<LockPersonIcon />} label="Secure Evaluation" color="secondary" variant="outlined" />
          </Stack>

          <Typography variant="h4" color="primary" sx={{ mb: 0.5, fontWeight: 700, fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
            CIT-EVAL
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Anonymous faculty evaluation platform
          </Typography>

          {error && (
            <Fade in timeout={220}>
              <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }} onClose={() => setError('')}>
                {error}
              </Alert>
            </Fade>
          )}

          {!adminView ? (
            <Zoom in timeout={220}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                  Sign in with your official Google account
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4, minHeight: 42 }}>
                  <GoogleLogin
                    onSuccess={onSuccess}
                    onError={() => setError('Google Sign-In failed.')}
                    useOneTap
                  />
                </Box>

                <Divider sx={{ my: 3 }}>Staff Access</Divider>
                <Button
                  startIcon={<AdminPanelSettingsIcon />}
                  fullWidth
                  variant="outlined"
                  onClick={() => { setAdminView(true); setError(''); }}
                  sx={{ py: 1.2, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  Administrator Portal
                </Button>
              </Box>
            </Zoom>
          ) : (
            <Zoom in timeout={220}>
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="h6" sx={{ mb: 0.5 }}>Admin Sign-In</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Access the decryption dashboard.
                </Typography>
                <TextField
                  fullWidth label="Username" margin="normal" size="small"
                  value={adminCreds.username}
                  onChange={e => setAdminCreds({ ...adminCreds, username: e.target.value })}
                />
                <TextField
                  fullWidth label="Password" type="password" margin="normal" size="small"
                  value={adminCreds.password}
                  onChange={e => setAdminCreds({ ...adminCreds, password: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleAdminAuth()}
                />
                <Button
                  fullWidth variant="contained" sx={{ mt: 3, py: 1.5, borderRadius: 2, fontWeight: 700 }}
                  onClick={handleAdminAuth}
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Login as Admin'}
                </Button>
                <Button fullWidth variant="text" sx={{ mt: 1, textTransform: 'none' }} onClick={() => setAdminView(false)}>
                  Back to Student Login
                </Button>
              </Box>
            </Zoom>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;