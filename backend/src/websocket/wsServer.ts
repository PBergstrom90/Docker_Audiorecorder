import { WebSocketServer, WebSocket, Data } from 'ws';
import fs from 'fs';
import path from 'path';
import { finalizeWavFile } from '../utils/audioFileUtils';

const PING_INTERVAL = 20000; // 20 seconds
const audioStoragePath = path.join(__dirname, '../../public/audio-storage');

export let currentMode: string = 'manual';
export let isDeviceOnline = false;
let deviceSocket: WebSocket | null = null;

const wss = new WebSocketServer({ port: 5001 });

export const setupWebSocketServer = (): void => {
  wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress || 'Unknown IP';
    console.log(`New WebSocket connection from: ${clientIp}`);

    let clientType: string | null = null;
    let tempStream: fs.WriteStream | null = null;
    let tempPath: string = '';

    // Periodic pings to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping(); // The server will emit 'pong' events when the client responds
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
      console.log(`Pong received from clientType: ${clientType}, IP: ${clientIp}`);
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
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