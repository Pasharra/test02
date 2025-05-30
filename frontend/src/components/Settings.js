import React from 'react';
import { Tabs, Tab, Box, Typography, Paper } from '@mui/material';
import { useNavigate, useLocation, Outlet, Routes, Route, Navigate } from 'react-router-dom';
import SecuritySettings from './SecuritySettings';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} role="tabpanel" style={{ width: '100%' }}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const tabRoutes = [
  { label: 'Security', path: '/settings/security' },
  { label: 'Notifications', path: '/settings/notifications' },
  { label: 'Subscription', path: '/settings/subscription' },
];

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
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
            <Route path="notifications" element={<Box p={3}><Typography variant="h6">Notification Settings (Coming soon)</Typography></Box>} />
            <Route path="subscription" element={<Box p={3}><Typography variant="h6">Subscription Settings (Coming soon)</Typography></Box>} />
            <Route path="" element={<Navigate to="security" replace />} />
          </Routes>
        </Box>
      </Paper>
    </Box>
  );
} 