import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Profile from './components/Profile';
import SecuritySettings from './components/SecuritySettings';
import Settings from './components/Settings';
import { CssBaseline, Box, Typography, Button } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';

function PostFeed() {
  const { isAuthenticated } = useAuth0();
  console.log('isAuthenticated: ' + isAuthenticated);
  return (
    <Box mt={6} textAlign="center">
      <Typography variant="h4">Welcome to the AI Content Web App!</Typography>
      <Typography variant="body1" mt={2}>This is the post feed. (Placeholder)</Typography>
    </Box>
  );
}

function Landing() {
  const { loginWithRedirect, isAuthenticated } = useAuth0();
  console.log('isAuthenticated: ' + isAuthenticated);
  if (isAuthenticated) return <Navigate to="/feed" replace />;
  return (
    <Box mt={10} textAlign="center">
      <Typography variant="h3" mb={3}>AI Content Web App</Typography>
      <Typography variant="body1" mb={4}>Sign up or log in to get started.</Typography>
      <Button
        variant="contained"
        color="primary"
        size="large"
        onClick={() => loginWithRedirect()}
      >
        Log In / Sign Up
      </Button>
    </Box>
  );
}

function App() {
  return (
    <Router>
      <CssBaseline />
      <Header />
      <Routes>
        <Route path="/feed" element={<PostFeed />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/" element={<Landing />} />
        <Route path="/settings/*" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
