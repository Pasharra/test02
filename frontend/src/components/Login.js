import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Alert, Divider, Stack } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

const Login = () => {
  const { loginWithRedirect, isAuthenticated, isLoading, error } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/feed', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleEmailLogin = async () => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          screen_hint: 'login',
        },
      });
    } catch (err) {
      alert('Something went wrong. Please try again in a moment.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          screen_hint: 'login',
          connection: 'google-oauth2',
        },
      });
    } catch (err) {
      alert('Something went wrong. Please try again in a moment.');
    }
  };

  return (
    <Box maxWidth={400} mx="auto" mt={6} p={3} boxShadow={2} borderRadius={2} bgcolor="#fff">
      <Typography variant="h5" mb={2} align="center">Log In</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        You will be redirected to a secure login page.
      </Alert>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}
      <Stack spacing={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleEmailLogin}
          disabled={isLoading}
          fullWidth
        >
          Log In with Email
        </Button>
        <Divider>or</Divider>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<GoogleIcon />}
          onClick={handleGoogleLogin}
          disabled={isLoading}
          fullWidth
        >
          Log In with Google
        </Button>
      </Stack>
      <Typography variant="body2" mt={2} align="center">
        Don&apos;t have an account?{' '}
        <Button variant="text" size="small" onClick={() => navigate('/signup')}>Sign Up</Button>
      </Typography>
    </Box>
  );
};

export default Login; 