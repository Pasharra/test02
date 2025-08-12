const express = require('express');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const config = require('../utils/config');
const { checkJwt, checkLoggedIn } = require('../utils/authHelper');

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

// Rate limiting: max 30 requests per 5 minutes per IP
const chatRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// System message for pet consultant persona
const SYSTEM_MESSAGE = {
  role: 'system',
  content: `Вы - эксперт по уходу за домашними животными, говорящий на русском языке. Вы дружелюбны, лаконичны и всегда готовы помочь с вопросами о питомцах. 

Важные правила:
- Отвечайте только на русском языке
- Будьте дружелюбными и понятными
- Давайте краткие, но полезные советы
- ВСЕГДА напоминайте владельцам: при серьезных проблемах со здоровьем питомца немедленно обращайтесь к ветеринару
- Не ставьте диагнозы и не назначайте лечение
- Если вопрос не связан с животными, вежливо перенаправьте беседу на тему питомцев

Ваша цель - помочь владельцам лучше понимать и заботиться о своих питомцах.`
};

// Retry function for OpenAI API calls with exponential backoff
async function callOpenAIWithRetry(messages, maxRetries = 2) {
  const delays = [250, 800]; // Exponential backoff delays in ms
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 700,
      });
      
      return completion;
    } catch (error) {
      const isRetryableError = error.status === 429 || (error.status >= 500 && error.status < 600);
      const isLastAttempt = attempt === maxRetries;
      
      if (!isRetryableError || isLastAttempt) {
        throw error; // Re-throw if not retryable or last attempt
      }
      
      // Wait before retry
      const delay = delays[attempt] || delays[delays.length - 1];
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`OpenAI API retry attempt ${attempt + 1} after ${delay}ms delay`);
    }
  }
}

// Function to strip dangerous control characters
function stripDangerousChars(text) {
  // Remove control characters except newline, carriage return, and tab
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// Function to truncate message history (keep last 12 messages excluding system)
function truncateHistory(messages) {
  const systemMessages = messages.filter(msg => msg.role === 'system');
  const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
  
  // Keep only last 12 non-system messages
  const truncatedNonSystem = nonSystemMessages.slice(-12);
  
  // Combine system messages with truncated history
  return [...systemMessages, ...truncatedNonSystem];
}

// Validation function for messages array
function validateMessages(messages) {
  if (!Array.isArray(messages)) {
    return 'Messages must be an array';
  }

  for (const message of messages) {
    if (!message || typeof message !== 'object') {
      return 'Each message must be an object';
    }

    if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
      return 'Each message must have a valid role (system, user, or assistant)';
    }

    if (!message.content || typeof message.content !== 'string') {
      return 'Each message must have content as a string';
    }

    // Validate content length
    if (message.content.length > 2000) {
      return 'Each message content must be 2000 characters or less';
    }
  }

  return null;
}

// Function to sanitize messages
function sanitizeMessages(messages) {
  return messages.map(message => ({
    ...message,
    content: stripDangerousChars(message.content)
  }));
}

// Function to log analytics
function logChatAnalytics(userId, tokensUsed, latency) {
  const timestamp = new Date().toISOString();
  console.log(`[CHAT_ANALYTICS] ${timestamp} | User: ${userId} | Tokens: ${tokensUsed} | Latency: ${latency}ms`);
}

// POST /api/chat endpoint
router.post('/', checkJwt, checkLoggedIn, chatRateLimit, async (req, res) => {
  const startTime = Date.now();
  const userId = req.auth && req.auth.sub;
  
  try {
    const { messages } = req.body;

    // Validate input
    if (!messages) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const validationError = validateMessages(messages);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Sanitize messages (strip dangerous control characters)
    let sanitizedMessages = sanitizeMessages(messages);

    // Truncate history (keep last 12 messages excluding system)
    sanitizedMessages = truncateHistory(sanitizedMessages);

    // Prepare messages array - prepend system message if not present
    let conversationMessages = [...sanitizedMessages];
    const hasSystemMessage = sanitizedMessages.some(msg => msg.role === 'system');
    
    if (!hasSystemMessage) {
      conversationMessages.unshift(SYSTEM_MESSAGE);
    }

    // Call OpenAI Chat Completions API with retry logic
    const completion = await callOpenAIWithRetry(conversationMessages);

    // Extract assistant response
    const assistantMessage = completion.choices[0]?.message?.content;

    if (!assistantMessage) {
      return res.status(500).json({ error: 'No response from OpenAI' });
    }

    // Calculate latency and log analytics
    const latency = Date.now() - startTime;
    const tokensUsed = completion.usage?.total_tokens || 0;
    logChatAnalytics(userId, tokensUsed, latency);

    // Return response
    res.json({ message: assistantMessage });

  } catch (error) {
    // Log analytics for failed requests too
    const latency = Date.now() - startTime;
    logChatAnalytics(userId, 0, latency);
    
    console.error('Chat API error:', error);

    // Handle OpenAI API errors
    if (error.status) {
      return res.status(error.status).json({ 
        error: error.message || 'OpenAI API error' 
      });
    }

    // Handle other errors
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
