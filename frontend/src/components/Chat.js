import React, { useState } from 'react';
import { Container, Typography, Box } from '@mui/material';
import { Fab, Webchat } from '@botpress/webchat';

const botpressClientId = process.env.REACT_APP_BOTPRESS_CLIENT_ID || '9648a271-82cc-4641-865d-1951628b3bf0';

const Chat = () => {
  const [isWebchatOpen, setIsWebchatOpen] = useState(true); // Start open by default on chat page

  const toggleWebchat = () => {
    setIsWebchatOpen((prevState) => !prevState);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        AI Chat Support
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Get instant help from our AI assistant. Ask questions about our content, features, or get support.
      </Typography>
      
      <Box sx={{ position: 'relative', height: '70vh', width: '100%' }}>
        <Webchat
          clientId={botpressClientId}
          style={{
            width: '100%',
            height: '100%',
            display: isWebchatOpen ? 'flex' : 'none',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        />
        
        {!isWebchatOpen && (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              backgroundColor: '#f5f5f5'
            }}
          >
            <Typography variant="h6" color="text.secondary">
              Click the chat button to start a conversation
            </Typography>
          </Box>
        )}
        
        <Fab
          onClick={toggleWebchat}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            width: '56px',
            height: '56px',
            backgroundColor: '#1976d2',
            color: 'white'
          }}
        />
      </Box>
    </Container>
  );
};

export default Chat;
