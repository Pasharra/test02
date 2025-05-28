import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignUp from './components/SignUp';
import Login from './components/Login';
import Header from './components/Header';
import Profile from './components/Profile';
import { CssBaseline, Box, Typography } from '@mui/material';

function PostFeed() {
  return (
    <Box mt={6} textAlign="center">
      <Typography variant="h4">Welcome to the AI Content Web App!</Typography>
      <Typography variant="body1" mt={2}>This is the post feed. (Placeholder)</Typography>
    </Box>
  );
}

function App() {
  return (
    <Router>
      <CssBaseline />
      <Header />
      <Routes>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/feed" element={<PostFeed />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
