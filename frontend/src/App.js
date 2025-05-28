import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignUp from './components/SignUp';
import Login from './components/Login';
import { CssBaseline, Box, Typography, Button } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';

function PostFeed() {
  const { isAuthenticated, logout, user } = useAuth0();
  return (
    <Box mt={6} textAlign="center">
      <Typography variant="h4">Welcome to the AI Content Web App!</Typography>
      <Typography variant="body1" mt={2}>This is the post feed. (Placeholder)</Typography>
      {isAuthenticated && (
        <Button
          variant="outlined"
          color="secondary"
          sx={{ mt: 4 }}
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        >
          Log Out{user && user.email ? ` (${user.email})` : ''}
        </Button>
      )}
    </Box>
  );
}

function App() {
  return (
    <Router>
      <CssBaseline />
      <Routes>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/feed" element={<PostFeed />} />
        <Route path="/" element={<Navigate to="/signup" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
