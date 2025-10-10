import express from 'express';
import http from 'http'; // Using Node's built-in HTTP module for streaming

const router = express.Router();

// Configuration for connecting to your Python AI server
const AI_SERVER_OPTIONS = {
  hostname: '127.0.0.1',
  port: 8000,
  path: '/ask-stream',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

router.post('/recipe-stream', (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required.' });
  }

  console.log(`Forwarding STREAMING query to AI service: "${query}"`);

  // Create a request to the Python AI server
  const proxyReq = http.request(AI_SERVER_OPTIONS, (proxyRes) => {
    // Set the headers for the client's response to enable streaming
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Pipe the data from the AI server directly back to the client
    proxyRes.pipe(res);
  });

  // Handle any errors during the connection to the AI server
  proxyReq.on('error', (err) => {
    console.error('Error communicating with the AI service:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to connect to the AI service.' });
    }
  });

  // Send the user's query in the request body to the Python server
  proxyReq.write(JSON.stringify({ query }));
  proxyReq.end();
});

export default router;

