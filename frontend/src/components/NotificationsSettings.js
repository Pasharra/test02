import React, { useState, useEffect } from 'react';
import { Box, Typography, Switch, Button, TextField, Alert, CircularProgress, Stack } from '@mui/material';

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
        // TODO: Replace with real API call
        // Simulate API response
        const prefs = {
          email: true,
          sms: false,
          webpush: false,
          phone: '',
          phoneVerified: false,
        };
        // Web Push support check
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
    fetchPrefs();
    return () => { mounted = false; };
  }, []);

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
    // Validate phone
    const phone = state.phoneInput.trim();
    if (!/^\+\d{10,15}$/.test(phone)) {
      setState(s => ({ ...s, phoneError: 'Please enter a valid phone number in international format (e.g., +12345678900).' }));
      return;
    }
    try {
      // TODO: Replace with real API call to send code
      await new Promise(res => setTimeout(res, 1000));
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
    // TODO: Replace with real API call to verify code
    await new Promise(res => setTimeout(res, 1000));
    if (state.code === '123456') { // Simulate success
      setState(s => ({ ...s, phone: s.phoneInput, phoneVerified: true, sms: true, verifying: false, codeSent: false, code: '' }));
      setSuccess('Phone number verified. SMS notifications enabled.');
    } else {
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
      // TODO: Replace with real API call to save preferences
      await new Promise(res => setTimeout(res, 1000));
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