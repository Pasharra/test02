import React, { useState, useEffect } from 'react';
import { Box, Typography, Switch, Button, TextField, Alert, CircularProgress, Stack } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';

const BACKEND_URI = process.env.REACT_APP_BACKEND_URI || '';

function isWebPushSupported() {
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

const initialState = {
  email: true,
  sms: false,
  webpush: false,
  phone: '',
  phoneVerified: false,
  phoneInput: '',
  phoneError: '',
  codeSent: false,
  code: '',
  codeError: '',
  verifying: false,
  webPushSupported: true,
};

export default function NotificationsSettings() {
  const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState(initialState);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Fetch notification preferences and phone info
  useEffect(() => {
    let mounted = true;
    async function fetchPrefs() {
      setLoading(true);
      setError('');
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch(`${BACKEND_URI}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch profile');
        const user = await res.json();
        const notifications = user.user_metadata && user.user_metadata.notifications ? user.user_metadata.notifications : {};
        const prefs = {
          email: notifications.email !== undefined ? notifications.email : true,
          sms: notifications.sms || false,
          webpush: notifications.webpush || false,
          phone: notifications.phone || '',
          phoneVerified: notifications.phoneVerified || false,
        };
        const webPushSupported = isWebPushSupported();
        if (mounted) {
          setState(s => ({
            ...s,
            ...prefs,
            phoneInput: prefs.phone || '',
            webPushSupported,
          }));
        }
      } catch (e) {
        setError('Could not load notification preferences.');
      }
      setLoading(false);
    }
    if (isAuthenticated && !isLoading) fetchPrefs();
    return () => { mounted = false; };
  }, [isAuthenticated, isLoading, getAccessTokenSilently]);

  // Handlers for toggles
  const handleToggle = (channel) => (e) => {
    setState(s => ({ ...s, [channel]: e.target.checked }));
  };

  // Phone number input/verification
  const handlePhoneInput = (e) => {
    setState(s => ({ ...s, phoneInput: e.target.value, phoneError: '' }));
  };

  const handleSendCode = async () => {
    setState(s => ({ ...s, codeSent: false, codeError: '', verifying: true }));
    const phone = state.phoneInput.trim();
    if (!/^\+\d{10,15}$/.test(phone)) {
      setState(s => ({ ...s, phoneError: 'Please enter a valid phone number in international format (e.g., +12345678900).' }));
      return;
    }
    // If phone is already verified and matches, skip verification
    if (state.phoneVerified && state.phone === phone) {
      setState(s => ({ ...s, codeSent: false, verifying: false, phoneVerified: true }));
      setSuccess('Phone number already verified.');
      return;
    }
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${BACKEND_URI}/api/notification/send-verification-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error('Failed to send verification code');
      // If backend says already verified, update state accordingly
      if (data.message && data.message.includes('already verified')) {
        setState(s => ({ ...s, codeSent: false, verifying: false, phoneVerified: true }));
        setSuccess('Phone number already verified.');
        return;
      }
      setState(s => ({ ...s, codeSent: true, verifying: false }));
      setSuccess("We've sent a verification code to your phone.");
    } catch {
      setState(s => ({ ...s, verifying: false }));
      setError('Could not send verification code. Please try again.');
    }
  };

  const handleCodeInput = (e) => {
    setState(s => ({ ...s, code: e.target.value, codeError: '' }));
  };

  const handleVerifyCode = async () => {
    setState(s => ({ ...s, verifying: true, codeError: '' }));
    setError('');
    setSuccess('');
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${BACKEND_URI}/api/notification/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: state.code, phone: state.phoneInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setState(s => ({ ...s, verifying: false, codeError: 'Verification failed. Please try again.' }));
        return;
      }
      setState(s => ({ ...s, phone: s.phoneInput, phoneVerified: true, sms: true, verifying: false, codeSent: false, code: '' }));
      setSuccess('Phone number verified. SMS notifications enabled.');
    } catch {
      setState(s => ({ ...s, verifying: false, codeError: 'Verification failed. Please try again.' }));
    }
  };

  const handleChangeNumber = () => {
    setState(s => ({ ...s, phone: '', phoneVerified: false, phoneInput: '', sms: false, codeSent: false, code: '' }));
  };

  // Save preferences
  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${BACKEND_URI}/api/profile/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: state.email,
          sms: state.sms,
          webpush: state.webpush,
          phone: state.phone,
          phoneVerified: state.phoneVerified,
        }),
      });
      if (!res.ok) throw new Error('Failed to save preferences');
      setSuccess('Notification preferences updated.');
    } catch {
      setError('Could not update preferences. Please try again.');
    }
    setSaving(false);
  };

  if (loading) return <Box py={6} textAlign="center"><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>Notification Preferences</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <Stack spacing={4}>
        {/* Email */}
        <Box>
          <Typography variant="subtitle1">Email</Typography>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Switch checked={state.email} onChange={handleToggle('email')} />
            <Typography>{state.email ? 'Enabled' : 'Disabled'}</Typography>
          </Stack>
        </Box>
        {/* SMS */}
        <Box>
          <Typography variant="subtitle1">SMS</Typography>
          {!state.phoneVerified ? (
            <>
              <Typography color="text.secondary" mb={1}>Add your phone number to enable SMS notifications.</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <TextField
                  label="Phone Number"
                  value={state.phoneInput}
                  onChange={handlePhoneInput}
                  error={!!state.phoneError}
                  helperText={state.phoneError}
                  size="small"
                  placeholder="+12345678900"
                  sx={{ minWidth: 220 }}
                  disabled={state.verifying}
                />
                <Button variant="contained" onClick={handleSendCode} disabled={state.verifying || !state.phoneInput}>
                  {state.verifying ? <CircularProgress size={20} /> : 'Send Code'}
                </Button>
              </Stack>
              {state.codeSent && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" mt={2}>
                  <TextField
                    label="Verification Code"
                    value={state.code}
                    onChange={handleCodeInput}
                    error={!!state.codeError}
                    helperText={state.codeError}
                    size="small"
                    sx={{ minWidth: 160 }}
                    disabled={state.verifying}
                  />
                  <Button variant="contained" onClick={handleVerifyCode} disabled={state.verifying || !state.code}>
                    {state.verifying ? <CircularProgress size={20} /> : 'Verify'}
                  </Button>
                </Stack>
              )}
            </>
          ) : (
            <>
              <Typography color="text.secondary" mb={1}>Verified phone: <b>{state.phone}</b></Typography>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Switch checked={state.sms} onChange={handleToggle('sms')} />
                <Typography>{state.sms ? 'Enabled' : 'Disabled'}</Typography>
                <Button variant="outlined" size="small" onClick={handleChangeNumber}>Change Number</Button>
              </Stack>
            </>
          )}
        </Box>
        {/* Web Push */}
        <Box>
          <Typography variant="subtitle1">Web Push</Typography>
          {state.webPushSupported ? (
            <Stack direction="row" alignItems="center" spacing={2}>
              <Switch checked={state.webpush} onChange={handleToggle('webpush')} />
              <Typography>{state.webpush ? 'Enabled' : 'Disabled'}</Typography>
            </Stack>
          ) : (
            <Typography color="text.secondary">Web push notifications are not supported in this browser.</Typography>
          )}
        </Box>
        <Box>
          <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Save Preferences'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
} 