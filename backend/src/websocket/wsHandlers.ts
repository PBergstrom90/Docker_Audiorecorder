import { WebSocket } from 'ws';

export const handleWebSocketConnection = (ws: WebSocket) => {
  console.log('New WebSocket connection established');
  ws.on('message', (data) => {
    const message = data.toString();
    console.log(`Received message: ${message}`);
  });

  ws.on('ping', () => ws.pong());
  ws.on('close', () => console.log('WebSocket connection closed'));
};
