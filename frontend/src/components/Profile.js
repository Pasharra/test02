import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Typography, Avatar, Paper } from '@mui/material';

const Profile = () => {
  const { user, isAuthenticated } = useAuth0();

  if (!isAuthenticated) return null;

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <Paper elevation={3} sx={{ p: 4, minWidth: 320, textAlign: 'center' }}>
        <Avatar
          src={user.picture}
          alt={user.name}
          sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}
        >
          {user.name ? user.name[0] : user.email[0]}
        </Avatar>
        <Typography variant="h6">{user.name || 'No Name'}</Typography>
        <Typography variant="body1" color="text.secondary">{user.email}</Typography>
      </Paper>
    </Box>
  );
};

export default Profile; 