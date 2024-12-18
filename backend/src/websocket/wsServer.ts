import { WebSocketServer, WebSocket, Data } from 'ws';
import fs from 'fs';
import path from 'path';
import { finalizeWavFile } from '../utils/audioFileUtils';

const PING_INTERVAL = 60000; // 60 seconds
const audioStoragePath = path.join(__dirname, '../../public/audio-storage');
const wss = new WebSocketServer({ port: 5001 });

export const setupWebSocketServer = (): void => {
  wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress || 'Unknown IP';
    console.log(`New WebSocket connection established from: ${clientIp}`);

    let clientType: string | null = null;
    let tempStream: fs.WriteStream | null = null;
    let tempPath: string;

    // Periodic ping to clients
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, PING_INTERVAL);

    ws.on('message', (data: Data, isBinary: boolean) => {
      const message = data.toString();

      if (!clientType && message.startsWith('TYPE:')) {
        clientType = message.split(':')[1].trim();
        ws.send(`ACK: Connected as ${clientType}`);
        return;
      }

      if (isBinary) {
        if (!tempStream) {
          tempPath = path.join(audioStoragePath, `temp_${Date.now()}.raw`);
          tempStream = fs.createWriteStream(tempPath);
          console.log(`Started new recording: ${tempPath}`);
        }
        console.log(`Received binary data of size: ${(data as ArrayBuffer).byteLength} bytes from: ${clientType}`);
        tempStream.write(data);
      } else if (message === 'START' && tempStream) { // Handle START message
        console.log('START signal received. Recording started on ESP32.');
        broadcastToClients('START');
      }  else if (message === 'END' && tempStream) { // Handle END message
        console.log('END signal received. Finalizing raw file...');
        tempStream.end();
        finalizeWavFile(tempPath);
        tempStream = null;
        broadcastToClients('END');
      }
    });

    ws.on('pong', () => console.log('Pong received'));
    ws.on('close', () => clearInterval(pingInterval));
  });

  console.log('WebSocket server running on port 5001');
};

// Notify the frontend client when recording is finished
export function broadcastToClients(message: string) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}