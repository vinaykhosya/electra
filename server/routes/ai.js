const express = require('express');
const axios = require('axios');

const router = express.Router();

// Proxy /recipe-stream to FastAPI /ask-stream (Elley logic)
router.post('/recipe-stream', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required.' });
  }
  try {
    const response = await axios.post('http://127.0.0.1:8000/ask-stream', { query }, {
      responseType: 'stream',
      headers: { 'Content-Type': 'application/json' }
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    response.data.pipe(res);
    response.data.on('end', () => res.end());
    response.data.on('error', () => res.end());
  } catch (error) {
    console.error('Error proxying to Elley AI service:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to communicate with Elley AI service.' });
    }
  }
});

module.exports = router;