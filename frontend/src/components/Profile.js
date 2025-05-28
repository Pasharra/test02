import React, { useState, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box, Typography, Avatar, Paper, TextField, Button, Stack, Alert, CircularProgress, IconButton
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';

const nameRegex = /^[A-Za-zА-Яа-яЁё\s'-]+$/;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const Profile = () => {
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [firstName, setFirstName] = useState(user?.given_name || '');
  const [lastName, setLastName] = useState(user?.family_name || '');
  const [avatar, setAvatar] = useState(user?.picture || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.picture || '');
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef();

  if (!isAuthenticated) return null;

  // Validation
  const isNameValid =
    firstName.trim() && lastName.trim() &&
    nameRegex.test(firstName) && nameRegex.test(lastName);

  const isChanged =
    firstName !== (user?.given_name || '') ||
    lastName !== (user?.family_name || '') ||
    avatarFile !== null || removeAvatar;

  const handleAvatarChange = (e) => {
    setError('');
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Avatar must be JPG, PNG, or WEBP.');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError('Avatar image must be under 2MB.');
      return;
    }
    setAvatarFile(file);
    setRemoveAvatar(false);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    setRemoveAvatar(true);
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      let pictureData = avatarPreview;
      if (avatarFile) {
        pictureData = avatarPreview;
      }
      if (removeAvatar) {
        pictureData = '';
      }
      const accessToken = await getAccessTokenSilently();
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          picture: pictureData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update profile.');
      setSuccess('Profile updated successfully.');
      setAvatar(removeAvatar ? '' : avatarPreview);
      setAvatarFile(null);
      setRemoveAvatar(false);
      setSaving(false);
    } catch (err) {
      setError(err.message || 'Could not update profile. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <Paper elevation={3} sx={{ p: 4, minWidth: 320, textAlign: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <Box position="relative">
            <Avatar
              src={avatarPreview}
              alt={firstName || user?.name}
              sx={{ width: 80, height: 80, mx: 'auto', mb: 1 }}
            >
              {(firstName || user?.name || user?.email || '?')[0]}
            </Avatar>
            <IconButton
              color="primary"
              component="label"
              sx={{ position: 'absolute', bottom: 0, right: 0 }}
            >
              <PhotoCamera />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                ref={fileInputRef}
                onChange={handleAvatarChange}
              />
            </IconButton>
            {avatarPreview && (
              <IconButton
                color="error"
                sx={{ position: 'absolute', top: 0, right: 0 }}
                onClick={handleRemoveAvatar}
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
          <TextField
            label="First Name"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            error={!!firstName && !nameRegex.test(firstName)}
            helperText={firstName && !nameRegex.test(firstName) ? 'Please enter a valid name using letters only.' : ''}
            fullWidth
          />
          <TextField
            label="Last Name"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            error={!!lastName && !nameRegex.test(lastName)}
            helperText={lastName && !nameRegex.test(lastName) ? 'Please enter a valid name using letters only.' : ''}
            fullWidth
          />
          <Typography variant="body2" color="text.secondary">{user.email}</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={!isChanged || !isNameValid || saving}
            sx={{ mt: 2, minWidth: 120 }}
            startIcon={saving && <CircularProgress size={18} />}
          >
            Save
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default Profile; 