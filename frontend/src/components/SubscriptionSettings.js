import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, Stack, CircularProgress, Alert } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';

const BACKEND_URI = process.env.REACT_APP_BACKEND_URI || '';

export default function SubscriptionSettings() {
  const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null); // null, 'none', 'active', 'syncing', etc.
  const [plan, setPlan] = useState('');
  const [renewal, setRenewal] = useState('');
  const [subStatus, setSubStatus] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      setLoading(true);
      setError('');
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch(`${BACKEND_URI}/api/subscription/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch subscription status');
        const data = await res.json();
        if (data.syncing) {
          setStatus('syncing');
        } else if (!data.active) {
          setStatus('none');
        } else {
          setStatus('active');
          setPlan(data.plan);
          setRenewal(data.renewal);
          setSubStatus(data.status);
        }
      } catch (e) {
        setError('Could not load subscription status.');
      }
      setLoading(false);
    }
    if (isAuthenticated && !isLoading) fetchStatus();
  }, [isAuthenticated, isLoading, getAccessTokenSilently]);

  const handleSubscribe = async () => {
    setActionLoading(true);
    setError('');
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${BACKEND_URI}/api/subscription/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error('Failed to create Stripe Checkout session');
      window.location.href = data.url;
    } catch {
      setError('Could not start subscription. Please try again.');
    }
    setActionLoading(false);
  };

  const handleManage = async () => {
    setActionLoading(true);
    setError('');
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${BACKEND_URI}/api/subscription/create-customer-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error('Failed to open Stripe Customer Portal');
      window.location.href = data.url;
    } catch {
      setError('Could not open Stripe Customer Portal. Please try again.');
    }
    setActionLoading(false);
  };

  if (loading) return <Box py={6} textAlign="center"><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>Subscription</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
        <Stack spacing={3}>
          {status === 'syncing' && (
            <Alert severity="info">We're syncing your subscription status. Please check back shortly.</Alert>
          )}
          {status === 'none' && (
            <>
              <Typography>You are not subscribed to premium content.</Typography>
              <Button variant="contained" color="primary" onClick={handleSubscribe} disabled={actionLoading}>
                {actionLoading ? <CircularProgress size={20} /> : 'Subscribe Now'}
              </Button>
            </>
          )}
          {status === 'active' && (
            <>
              <Typography>Current plan: <b>{plan}</b></Typography>
              <Typography>Renewal/Billing date: <b>{renewal}</b></Typography>
              <Typography>Status: <b>{subStatus}</b></Typography>
              <Button variant="contained" color="primary" onClick={handleManage} disabled={actionLoading}>
                {actionLoading ? <CircularProgress size={20} /> : 'Manage Subscription'}
              </Button>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
} 