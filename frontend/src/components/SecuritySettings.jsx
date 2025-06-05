import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Typography, Paper, Stack, TextField, Button, Alert, CircularProgress } from '@mui/material';
import { fetchUserProfile } from './Profile';

const BACKEND_URI = process.env.REACT_APP_BACKEND_URI || '';

const passwordRules = [
  { regex: /.{8,}/, label: 'at least 8 characters' },
  { regex: /[A-Z]/, label: 'an uppercase letter' },
  { regex: /[a-z]/, label: 'a lowercase letter' },
  { regex: /[0-9]/, label: 'a number' },
  { regex: /[^A-Za-z0-9]/, label: 'a special character' },
];

const SecuritySettings = () => {
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [provider, setProvider] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [resendError, setResendError] = useState('');
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMe = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchUserProfile(getAccessTokenSilently);
        setEmail(data.email);
        setProvider(data.identities[0].provider);
        setEmailVerified(data.email_verified);
      } catch (e) {
        setError(e.message || 'Could not fetch security info.');
      }
      setLoading(false);
    };
    if (isAuthenticated) fetchMe();
  }, [isAuthenticated, getAccessTokenSilently]);

  const handleResend = async () => {
    setResendStatus('');
    setResendError('');
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${BACKEND_URI}/api/profile/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setResendStatus('Verification email sent.');
      } else {
        setResendError('Could not send verification email. Please try again.');
      }
    } catch {
      setResendError('Could not send verification email. Please try again.');
    }
  };

  const validatePassword = (pw) =>
    passwordRules.every((rule) => rule.regex.test(pw));

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (!pwCurrent || !pwNew || !pwConfirm) {
      setPwError('All fields are required.');
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwNew === pwCurrent) {
      setPwError('New password must be different from the current password.');
      return;
    }
    if (!validatePassword(pwNew)) {
      setPwError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
      return;
    }
    setPwLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${BACKEND_URI}/api/profile/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ current: pwCurrent, new: pwNew }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwSuccess('Password updated successfully.');
        setPwCurrent('');
        setPwNew('');
        setPwConfirm('');
      } else {
        if (data.code === 'INCORRECT_CURRENT') setPwError('Current password is incorrect.');
        else if (data.code === 'WEAK') setPwError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
        else if (data.code === 'SAME_AS_OLD') setPwError('New password must be different from the current password.');
        else setPwError('Could not update password. Please try again.');
      }
    } catch {
      setPwError('Could not update password. Please try again.');
    }
    setPwLoading(false);
  };

  if (isLoading || loading) return <Box py={6} textAlign="center"><CircularProgress /></Box>;
  if (!isAuthenticated) return <Box py={6} textAlign="center"><Typography>Please log in</Typography></Box>;

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>Security Settings</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper elevation={1} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle1">Email</Typography>
            <Typography color="text.secondary" sx={{ wordBreak: 'break-all' }}>{email}</Typography>
            {provider === 'google-oauth2' ? (
              <>
                <Typography color="success.main" fontWeight={500} variant="body2" mt={1}>Verified via Google</Typography>
                <Alert severity="info" sx={{ mt: 2 }}>
                  You signed up with Google. To change your email or password, please manage your account via Google Account settings. These options are not available here for social login users.
                </Alert>
              </>
            ) : (
              <>
                {emailVerified ? (
                  <Typography color="success.main" fontWeight={500} variant="body2" mt={1}>Verified</Typography>
                ) : (
                  <>
                    <Typography color="warning.main" fontWeight={500} variant="body2" mt={1}>Your email is not verified.</Typography>
                    <Button
                      variant="contained"
                      sx={{ mt: 2, width: { xs: '100%', sm: 'auto' } }}
                      onClick={handleResend}
                      disabled={!!resendStatus}
                    >
                      Resend verification email
                    </Button>
                    {resendStatus && <Alert severity="success" sx={{ mt: 2 }}>{resendStatus}</Alert>}
                    {resendError && <Alert severity="error" sx={{ mt: 2 }}>{resendError}</Alert>}
                  </>
                )}
              </>
            )}
          </Box>
        </Stack>
      </Paper>
      {provider !== 'google-oauth2' && (
        <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
          <form onSubmit={handleChangePassword}>
            <Stack spacing={2}>
              <Typography variant="subtitle1">Change Password</Typography>
              <TextField
                type="password"
                label="Current password"
                value={pwCurrent}
                onChange={e => setPwCurrent(e.target.value)}
                disabled={pwLoading}
                autoComplete="current-password"
                fullWidth
              />
              <TextField
                type="password"
                label="New password"
                value={pwNew}
                onChange={e => setPwNew(e.target.value)}
                disabled={pwLoading}
                autoComplete="new-password"
                fullWidth
              />
              <TextField
                type="password"
                label="Confirm new password"
                value={pwConfirm}
                onChange={e => setPwConfirm(e.target.value)}
                disabled={pwLoading}
                autoComplete="new-password"
                fullWidth
              />
              {pwError && <Alert severity="error">{pwError}</Alert>}
              {pwSuccess && <Alert severity="success">{pwSuccess}</Alert>}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={pwLoading}
                fullWidth
              >
                {pwLoading ? <CircularProgress size={20} /> : 'Save'}
              </Button>
              <Typography variant="caption" color="text.secondary">
                Password must be at least 8 characters and include uppercase, lowercase, number, and special character.
              </Typography>
            </Stack>
          </form>
        </Paper>
      )}
    </Box>
  );
};

export default SecuritySettings; 