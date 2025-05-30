import React, { useState } from 'react';
import { AppBar, Toolbar, IconButton, Avatar, Menu, MenuItem, Box, Tooltip, Divider, Alert } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

const stringToColor = (string) => {
  let hash = 0, i, color = '#';
  for (i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  for (i = 0; i < 3; i++) {
    color += ('00' + ((hash >> (i * 8)) & 0xFF).toString(16)).slice(-2);
  }
  return color;
};

const stringAvatar = (name, email) => {
  if (!name && !email) return {};
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase()
    : email[0].toUpperCase();
  return {
    sx: {
      bgcolor: stringToColor(email || name),
    },
    children: initials,
  };
};

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth0();
  const [anchorEl, setAnchorEl] = useState(null);
  const [logoutError, setLogoutError] = useState('');
  const navigate = useNavigate();

  if (!isAuthenticated) return null;

  const handleMenu = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };

  const handleSettings = () => {
    handleClose();
    navigate('/settings/security');
  };

  const handleLogout = async () => {
    handleClose();
    setLogoutError('');
    try {
      await logout({ logoutParams: { returnTo: window.location.origin } });
    } catch (err) {
      setLogoutError('Logout failed. Please try again.');
    }
  };

  return (
    <>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ justifyContent: 'flex-end' }}>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title={user?.email || ''}>
            <IconButton onClick={handleMenu} size="large" sx={{ ml: 2 }}>
              {user?.picture ? (
                <Avatar alt={user.name} src={user.picture} />
              ) : (
                <Avatar {...stringAvatar(user?.name, user?.email)}>
                  <AccountCircleIcon />
                </Avatar>
              )}
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={handleProfile}>Profile</MenuItem>
            <MenuItem onClick={handleSettings}>Settings</MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      {logoutError && (
        <Alert severity="error" sx={{ position: 'fixed', top: 70, right: 20, zIndex: 9999 }}>
          {logoutError}
        </Alert>
      )}
    </>
  );
};

export default Header; 