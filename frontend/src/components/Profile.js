import React, { useState, useRef, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box, Typography, Avatar, Paper, TextField, Button, Stack, Alert, CircularProgress, IconButton
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';

const nameRegex = /^[A-Za-zА-Яа-яЁё\s'-]+$/;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const BACKEND_URI = process.env.REACT_APP_BACKEND_URI || '';

const Profile = () => {
  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [initialFirstName, setInitialFirstName] = useState('');
  const [initialLastName, setInitialLastName] = useState('');
  const [initialAvatar, setInitialAvatar] = useState('');
  const fileInputRef = useRef();

  // Fetch user profile from backend after authentication
  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated) return;
      setError('');
      try {
        const accessToken = await getAccessTokenSilently();
        const res = await fetch(`${BACKEND_URI}/api/profile`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!res.ok) {
          let errorMsg = `Could not fetch profile. (${res.status} ${res.statusText})`;
          try {
            const errData = await res.json();
            if (errData && errData.error) errorMsg = errData.error;
          } catch {}
          throw new Error(errorMsg);
        }
        const data = await res.json();
        setFirstName(data.given_name || '');
        setLastName(data.family_name || '');
        setAvatar(data.picture || '');
        setAvatarPreview(data.picture || '');
        setInitialFirstName(data.given_name || '');
        setInitialLastName(data.family_name || '');
        setInitialAvatar(data.picture || '');
      } catch (err) {
        setError(err.message || 'Could not fetch profile.');
      }
    };
    fetchProfile();
    // eslint-disable-next-line
  }, [isAuthenticated]);

  if (isLoading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress /></Box>;
  }

  if (!isAuthenticated) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><Typography>Please log in</Typography></Box>;
  }

  // Validation
  const isFirstNameEmpty = !firstName.trim();
  const isLastNameEmpty = !lastName.trim();
  const isNameValid =
    !isFirstNameEmpty && !isLastNameEmpty &&
    nameRegex.test(firstName) && nameRegex.test(lastName);

  const isChanged =
    firstName !== initialFirstName ||
    lastName !== initialLastName ||
    ((avatarPreview !== initialAvatar) && (avatarFile !== null || removeAvatar));

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
      const accessToken = await getAccessTokenSilently();
      let pictureData = avatar;
      // If removing avatar
      if (removeAvatar) {
        pictureData = '';
      } else if (avatarFile) {
        // Upload to S3
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const uploadRes = await fetch(`${BACKEND_URI}/api/profile/avatar/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        });
        if (!uploadRes.ok) {
          let errorMsg = `Failed to upload avatar. (${uploadRes.status} ${uploadRes.statusText})`;
          try {
            const errData = await uploadRes.json();
            if (errData && errData.error) errorMsg = errData.error;
          } catch {}
          throw new Error(errorMsg);
        }
        const uploadData = await uploadRes.json();
        pictureData = uploadData.url;
      }
      const res = await fetch(`${BACKEND_URI}/api/profile`, {
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
      if (!res.ok) {
        let errorMsg = `Could not update profile. (${res.status} ${res.statusText})`;
        try {
          const errData = await res.json();
          if (errData && errData.error) errorMsg = errData.error;
        } catch {}
        throw new Error(errorMsg);
      }
      //const data = await res.json();
      setSuccess('Profile updated successfully.');
      setInitialFirstName(firstName || '');
      setInitialLastName(lastName || '');
      setInitialAvatar(pictureData || '');
      setAvatar(removeAvatar ? '' : pictureData);
      setAvatarFile(null);
      setRemoveAvatar(false);
      setSaving(false);
      //await getAccessTokenSilently({ ignoreCache: true });
      //window.location.reload();
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
          {isFirstNameEmpty || isLastNameEmpty ? (
            <Alert severity="error">Name cannot be empty.</Alert>
          ) : null}
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