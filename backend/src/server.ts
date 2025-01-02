import express from 'express';
import path from 'path';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import { audioRoutes } from './routes/audioRoutes';
import { healthRoutes } from './routes/healthRoutes';
import { serveWithCSP } from './utils/csp';
import { setupWebSocketServer, currentMode, isDeviceOnline } from './websocket/wsServer';
import { corsOptions } from './config/corsConfig';

const app = express();
const PORT = process.env.PORT || 5000;
const serverOptions = {
  key: fs.readFileSync('/etc/nginx/certs/server.key'),
  cert: fs.readFileSync('/etc/nginx/certs/server.crt'),
};
const httpsServer = https.createServer(serverOptions, app);

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Serve static audio files from /public/audio-storage
app.use('/audio-storage', express.static(path.join(__dirname, '../public/audio-storage')));

// Routes
app.use('/api', audioRoutes);
app.use('/health', healthRoutes);

// Current mode
app.get('/api/current-mode', cors(corsOptions), (req, res) => {
  res.type('application/json');
  console.log(`Returning current mode: ${currentMode}`);
  res.json({ mode: currentMode });
});
app.options('/api/current-mode', cors(corsOptions));

// ESP32 status
app.get('/api/status', cors(corsOptions), (req, res) => {
  res.type('application/json');
  console.log(`Returning ESP32 status: ${isDeviceOnline}`);
  res.json({ isOnline: isDeviceOnline });
});
app.options('/api/status', cors(corsOptions));

// Serve frontend
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

// Start HTTPS server
httpsServer.listen(PORT, () => {
  console.log(`Backend running on https://192.168.50.221:${PORT}`);
});