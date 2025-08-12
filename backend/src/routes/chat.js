const express = require('express');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const config = require('../utils/config');

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
  }

  return null;
}

// POST /api/chat endpoint
router.post('/', chatRateLimit, async (req, res) => {
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

    // Prepare messages array - prepend system message if not present
    let conversationMessages = [...messages];
    const hasSystemMessage = messages.some(msg => msg.role === 'system');
    
    if (!hasSystemMessage) {
      conversationMessages.unshift(SYSTEM_MESSAGE);
    }

    // Call OpenAI Chat Completions API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using gpt-4o-mini as specified
      messages: conversationMessages,
      temperature: 0.7,
      max_tokens: 700,
    });

    // Extract assistant response
    const assistantMessage = completion.choices[0]?.message?.content;

    if (!assistantMessage) {
      return res.status(500).json({ error: 'No response from OpenAI' });
    }

    // Return response
    res.json({ message: assistantMessage });

  } catch (error) {
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
