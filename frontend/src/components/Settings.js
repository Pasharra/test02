import React from 'react';
import { Tabs, Tab, Box, Typography, Paper } from '@mui/material';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import SecuritySettings from './SecuritySettings';
import NotificationsSettings from './NotificationsSettings';
import SubscriptionSettings from './SubscriptionSettings';
import { useAuth0 } from '@auth0/auth0-react';
import { isUserAdmin } from './Profile';

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth0();

  if (isLoading) return null;

  const isAdmin = isUserAdmin(user);

  // Only show Security tab for admin
  const tabRoutes = isAdmin
    ? [
        { label: 'Security', path: '/settings/security' },
      ]
    : [
        { label: 'Security', path: '/settings/security' },
        { label: 'Notifications', path: '/settings/notifications' },
        { label: 'Subscription', path: '/settings/subscription' },
      ];

  const currentTab = tabRoutes.findIndex(tab => location.pathname.startsWith(tab.path));
  const tabValue = currentTab === -1 ? 0 : currentTab;

  const handleTabChange = (event, newValue) => {
    navigate(tabRoutes[newValue].path);
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 6, p: 2 }}>
      <Typography variant="h4" mb={3} textAlign="center">Settings</Typography>
      <Paper elevation={2} sx={{ borderRadius: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          {tabRoutes.map(tab => <Tab key={tab.path} label={tab.label} />)}
        </Tabs>
        <Box>
          <Routes>
            <Route path="security" element={<SecuritySettings />} />
            {!isAdmin && <Route path="notifications" element={<NotificationsSettings />} />}
            {!isAdmin && <Route path="subscription" element={<SubscriptionSettings />} />}
            <Route path="" element={<Navigate to="security" replace />} />
          </Routes>
        </Box>
      </Paper>
    </Box>
  );
} 