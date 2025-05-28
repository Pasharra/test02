import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Alert,
  Divider,
  Stack,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
// const TestLogin = () => {
//   const { loginWithRedirect } = useAuth0();
//   return <button onClick={() => loginWithRedirect()}>Test Login</button>;
// };

const SignUp = () => {
  const { error, isLoading, isAuthenticated, user, loginWithRedirect } = useAuth0();
  const [errorMessage, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const navigate = useNavigate();

  //console.log(error, isLoading, isAuthenticated, user);
  //console.log(errorMessage, setError);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/feed', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleEmailSignUp = async () => {
    setSubmitting(true);
    setError('');
    try {
      await loginWithRedirect({
        authorizationParams: {
          screen_hint: 'signup',
        },
      });
    } catch (err) {
      setError('Something went wrong. Please try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setSubmitting(true);
    setError('');
    try {
      await loginWithRedirect({
        authorizationParams: {
          screen_hint: 'signup',
          connection: 'google-oauth2',
        },
      });
    } catch (err) {
      setError('Something went wrong. Please try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box maxWidth={400} mx="auto" mt={6} p={3} boxShadow={2} borderRadius={2} bgcolor="#fff">
      <Typography variant="h5" mb={2} align="center">Sign Up</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        Account creation happens securely on the Auth0 page. You will be redirected to complete signup.
      </Alert>
      {errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}
      <Stack spacing={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleEmailSignUp}
          disabled={submitting || isLoading}
          fullWidth
        >
          Sign Up with Email
        </Button>
        <Divider>or</Divider>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<GoogleIcon />}
          onClick={handleGoogleSignUp}
          disabled={submitting || isLoading}
          fullWidth
        >
          Sign Up with Google
        </Button>
      </Stack>
      <Typography variant="body2" mt={2} align="center">
        Already have an account?{' '}
        <Button variant="text" size="small" onClick={() => navigate('/login')}>Log In</Button>
      </Typography>
      {/* <TestLogin /> */}
    </Box>
  );
};

export default SignUp; 