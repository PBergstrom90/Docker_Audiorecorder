import { WebSocketServer, WebSocket, Data } from 'ws';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { finalizeWavFile } from '../utils/audioFileUtils';

const PING_INTERVAL = 20000; // 20 seconds
const PONG_TIMEOUT = 30000; // 30 seconds
const audioStoragePath = path.join(__dirname, '../../public/audio-storage');

const serverOptions = {
  key: fs.readFileSync('/etc/nginx/certs/server.key'),
  cert: fs.readFileSync('/etc/nginx/certs/server.crt'),
  ca: fs.readFileSync('/etc/nginx/certs/ca.crt'),
};

export let currentMode: string = 'manual';
export let isDeviceOnline = false;
export let deviceSocket: WebSocket | null = null;
let lastPongTimestamp: number | null = null;

const httpsServer = https.createServer(serverOptions);
const wss = new WebSocketServer({ server: httpsServer });

export const setupWebSocketServer = (): void => {
  httpsServer.listen(5001, () => {
    console.log('WebSocket server running on wss://localhost:5001');
  });
  
  wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress || 'Unknown IP';
    console.log(`New WebSocket connection from: ${clientIp}`);

    let clientType: string | null = null;
    let tempStream: fs.WriteStream | null = null;
    let tempPath: string = '';
    let pongTimeout: NodeJS.Timeout | null = null;

    const checkPongTimeout = setInterval(() => {
      if (deviceSocket === ws && lastPongTimestamp !== null) {
        const now = Date.now();
        if (now - lastPongTimestamp > PONG_TIMEOUT) {
          console.log('Pong timeout exceeded for ESP32. Marking as offline.');
          isDeviceOnline = false;
          deviceSocket = null;
          lastPongTimestamp = null;
        }
      }
    }, PONG_TIMEOUT); // Check at half the timeout interval

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
        console.log(`Sending ping to ${clientType || 'Unknown client'}`);
      }
    }, PING_INTERVAL);

    ws.on('message', (data: Data, isBinary: boolean) => {
      const message = data.toString();
    
      // 1) Client type
      if (!clientType && message.startsWith('TYPE:')) {
        clientType = message.split(':')[1].trim();
        ws.send(`ACK: Connected as ${clientType}`);
        console.log(`Client type: ${clientType}`);
    
        if (clientType === 'ESP32') {
          isDeviceOnline = true;
          deviceSocket = ws;
          lastPongTimestamp = Date.now();
          console.log('ESP32 is now ONLINE');
        } else if (clientType === 'FRONTEND') {
          console.log('Frontend client connected.');
        }
        return;
      }
    
      // 2) MODE changes
      if (!isBinary && message.startsWith('MODE:')) {
        const newMode = message.split(':')[1].trim();
        if (newMode === 'automatic' || newMode === 'manual') {
          currentMode = newMode;
          console.log(`Mode updated to: ${currentMode}`);
          broadcastToClients(`MODE:${currentMode}`);
        } else {
          console.error(`Invalid mode: ${newMode}`);
        }
        return;
      }
    
      // 3) Device errors
      if (!isBinary && message.startsWith('ERROR:')) {
        const errorMessage = message.split(':')[1].trim();
        console.error(`ESP32 Error: ${errorMessage}`);
        ws.send(`ERROR: ${errorMessage}`);
        broadcastToClients(`ERROR: ${errorMessage}`);
        return;
      }
    
      // 4) START
      if (!isBinary && message === 'START') {
        console.log('START signal received from ESP32.');
        if (tempStream) {
          console.warn('tempStream was already open. Closing previous file before starting new one.');
          tempStream.end();
          finalizeWavFile(tempPath);
          tempStream = null;
        }
        tempPath = path.join(audioStoragePath, `temp_${Date.now()}.raw`);
        tempStream = fs.createWriteStream(tempPath);
        console.log(`File created for recording: ${tempPath}`);
        broadcastToClients('START');
        return;
      }
    
      // 5) END
      if (!isBinary && message === 'END') {
        if (tempStream) {
          console.log('END signal received. Finalizing raw file...');
          tempStream.end();
          finalizeWavFile(tempPath);
          tempStream = null;
          broadcastToClients('END');
        } else {
          console.warn('END signal received, but no tempStream was open.');
          broadcastToClients('END');
        }
        return;
      }
    
      // 6) Binary data => audio streaming
      if (isBinary) {
        if (!tempStream) {
          console.log('Warning: Received binary data but no tempStream is open. Creating file automatically...');
          tempPath = path.join(audioStoragePath, `temp_${Date.now()}.raw`);
          tempStream = fs.createWriteStream(tempPath);
        }
        tempStream.write(data);
        return;
      }
    
      // 7) Anything else => unknown
      console.warn('Unknown WebSocket message received:', message);
    });

    ws.on('pong', () => {
      if (ws === deviceSocket) {
        lastPongTimestamp = Date.now();
        console.log(`Pong received from ESP32. Timestamp updated.`);
      }
  });

    ws.on('close', () => {
      clearInterval(pingInterval);
      clearInterval(checkPongTimeout);
      console.log('WebSocket connection closed.');
      // If this was the ESP32's socket, mark as offline
      if (ws === deviceSocket) {
        isDeviceOnline = false;
        deviceSocket = null;
        console.log('ESP32 is now OFFLINE');
      }
    });

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  });

  console.log('WebSocket server running on port 5001');
};

// Broadcast a message to all connected WebSocket clients
export function broadcastToClients(message: string) {
  console.log(`Broadcasting message: ${message}`);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}