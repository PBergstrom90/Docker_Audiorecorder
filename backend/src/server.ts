import express from 'express';
import path from 'path';
import cors from 'cors';
import { audioRoutes } from './routes/audioRoutes';
import { healthRoutes } from './routes/healthRoutes';
import { serveWithCSP } from './utils/csp';
import { setupWebSocketServer } from './websocket/wsServer';
import { corsOptions } from './config/corsConfig';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors(corsOptions));
app.use(express.json()); // Parse JSON request bodies (if needed)
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Serve static audio files from /public/audio-storage
app.use('/audio-storage', express.static(path.join(__dirname, '../public/audio-storage')));

// Routes
app.use('/api', audioRoutes);
app.use('/health', healthRoutes);

// Catch-all route for serving the frontend with CSP headers
app.get('/*', (req, res) => {
  const buildPath = path.join(__dirname, '../frontend/build/index.html');
  serveWithCSP(req, res, buildPath);
});

// Start WebSocket Server
setupWebSocketServer();

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

// Start HTTP server
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
