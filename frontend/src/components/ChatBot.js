import React, { useState, useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Avatar,
  CircularProgress,
  Alert,
  Stack,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Login as LoginIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const BACKEND_URI = process.env.REACT_APP_BACKEND_URI || '';

const ChatBot = () => {
  const { isAuthenticated, loginWithRedirect, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Initialize with welcome message
  useEffect(() => {
    if (isAuthenticated && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: 'Привет! Я ваш помощник по уходу за домашними животными. Задайте мне любой вопрос о ваших питомцах!',
        timestamp: new Date()
      }]);
    }
  }, [isAuthenticated, messages.length]);

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    };

    // Add user message and clear input
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setError('');

    try {
      // Prepare message history for API (exclude timestamps)
      const messageHistory = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Get access token and call API
      const token = await getAccessTokenSilently();
      const response = await fetch(`${BACKEND_URI}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: messageHistory
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add assistant response
      const assistantMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  const handleNewConversation = () => {
    setMessages([{
      role: 'assistant',
      content: 'Привет! Я ваш помощник по уходу за домашними животными. Задайте мне любой вопрос о ваших питомцах!',
      timestamp: new Date()
    }]);
    setInputText('');
    setError('');
  };

  // Loading state
  if (authLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  // Not authenticated - show CTA
  if (!isAuthenticated) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <BotIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              AI Pet Consultant
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              Получите персональные советы по уходу за вашими питомцами от нашего AI-консультанта. 
              Задавайте вопросы о кормлении, здоровье, поведении и многом другом!
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={() => loginWithRedirect()}
              sx={{ px: 4, py: 1.5 }}
            >
              Войти для начала чата
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 2, height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BotIcon color="primary" />
            <Box>
              <Typography variant="h6">AI Pet Consultant</Typography>
              <Typography variant="body2" color="text.secondary">
                Ваш персональный помощник по уходу за питомцами
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleNewConversation}
            disabled={isLoading}
            sx={{ minWidth: 'auto', px: 2 }}
          >
            Новый диалог
          </Button>
        </Box>
      </Paper>

      {/* Messages Container */}
      <Paper 
        elevation={1} 
        sx={{ 
          flex: 1, 
          p: 2, 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column',
          gap: 2,
          mb: 2
        }}
      >
        {messages.map((message, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-start',
              gap: 1
            }}
          >
            {message.role === 'assistant' && (
              <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                <BotIcon fontSize="small" />
              </Avatar>
            )}
            
            <Paper
              elevation={2}
              sx={{
                p: 2,
                maxWidth: '70%',
                bgcolor: message.role === 'user' ? 'primary.main' : 'grey.100',
                color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                borderRadius: 2,
                borderBottomRightRadius: message.role === 'user' ? 1 : 2,
                borderBottomLeftRadius: message.role === 'assistant' ? 1 : 2,
              }}
            >
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {message.content}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'block', 
                  mt: 1, 
                  opacity: 0.7,
                  color: message.role === 'user' ? 'inherit' : 'text.secondary'
                }}
              >
                {message.timestamp.toLocaleTimeString()}
              </Typography>
            </Paper>

            {message.role === 'user' && (
              <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                <PersonIcon fontSize="small" />
              </Avatar>
            )}
          </Box>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
              <BotIcon fontSize="small" />
            </Avatar>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 2,
                borderBottomLeftRadius: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Ассистент печатает...
                </Typography>
              </Box>
            </Paper>
          </Box>
        )}

        {/* Error message */}
        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError('')}
            sx={{ mx: 2 }}
          >
            {error}
          </Alert>
        )}

        {/* Auto-scroll target */}
        <div ref={messagesEndRef} />
      </Paper>

      {/* Input Form */}
      <Paper elevation={1} sx={{ p: 2 }}>
        <form onSubmit={handleSubmit}>
          <Stack direction="row" spacing={1} alignItems="flex-end">
            <TextField
              fullWidth
              multiline
              maxRows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Задайте вопрос о ваших питомцах..."
              disabled={isLoading}
              variant="outlined"
              size="small"
            />
            <Button
              type="submit"
              variant="contained"
              disabled={!inputText.trim() || isLoading}
              sx={{ minWidth: 'auto', px: 2, py: 1 }}
            >
              {isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SendIcon />
              )}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default ChatBot;
