import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto'; // Import crypto for nonce generation
import cors from 'cors';
import { WebSocketServer, WebSocket, Data } from 'ws';

const app = express();
const PORT = process.env.PORT || 5000;
const wss = new WebSocketServer({ port: 5001 });

// CORS Configuration
const corsOptions = {
  origin: 'http://localhost:3000', // React frontend origin
  methods: ['GET', 'POST', 'OPTIONS'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
};
app.use(cors(corsOptions)); // Apply CORS middleware globally

// Serve the frontend
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Ensure the audio storage directory exists
const audioStoragePath = path.join(__dirname, '../public/audio-storage');
if (!fs.existsSync(audioStoragePath)) {
  fs.mkdirSync(audioStoragePath, { recursive: true });
  console.log(`Created audio storage directory at: ${audioStoragePath}`);
}

// Serve static audio files
app.use('/audio-storage', express.static(audioStoragePath));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, audioStoragePath);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueFilename);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(wav|mp3)$/)) {
      return cb(new Error('Only .wav and .mp3 files are allowed!'));
    }
    cb(null, true);
  },
});

// API: Upload audio file
app.post('/api/upload-audio', upload.single('audio'), (req: express.Request, res: express.Response): void => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  console.log(`File uploaded: ${req.file.filename}`);
  res.status(200).json({ message: 'File uploaded successfully', fileName: req.file.filename });
});

// API: Get list of audio files
app.get('/api/audio-files', (req, res) => {
  fs.readdir(audioStoragePath, (err, files) => {
    if (err) {
      console.error('Error reading audio directory:', err);
      return res.status(500).json({ error: 'Unable to read audio directory' });
    }
    const audioFiles = files.filter((file) => file.endsWith('.wav') || file.endsWith('.mp3'));
    console.log('Audio files retrieved:', audioFiles);
    res.status(200).json(audioFiles);
  });
});

// API: Delete audio file
app.delete('/api/audio-files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(audioStoragePath, filename);

  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        return res.status(500).json({ error: 'Failed to delete file' });
      }
      res.status(200).json({ message: `${filename} deleted successfully` });
    });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// WebSocket setup
wss.on('connection', (ws: WebSocket) => {
  console.log('ESP32 connected via WebSocket');

  let tempStream: fs.WriteStream | null = null;
  let tempPath: string;

  ws.on('message', (data: Data, isBinary: boolean) => {
    if (isBinary) {
      // Dynamically create a new temp file when binary data starts arriving
      if (!tempStream) {
        tempPath = path.join(audioStoragePath, `temp_${Date.now()}.raw`);
        tempStream = fs.createWriteStream(tempPath);
        console.log(`Started new recording: ${tempPath}`);
      }

      console.log(`Received binary data of size: ${(data as ArrayBuffer).byteLength} bytes`);
      tempStream.write(data);
    } else {
      const message = data.toString();
      console.log(`Received message: ${message}`);

      if (message === 'END') {
        if (tempStream) {
          console.log('END signal received. Finalizing raw file...');
          tempStream.end();

          tempStream.on('finish', () => {
            console.log(`Raw file successfully closed: ${tempPath}`);
            finalizeWavFile(tempPath);
            tempStream = null; // Reset for the next recording session
            broadcastToClients('END');
          });
        } else {
          console.error('No active recording to finalize.');
        }
      }
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    // Ensure cleanup in case the connection closes unexpectedly
    if (tempStream) {
      tempStream.end();
      tempStream = null;
    }
  });
});

// Notify the frontend client when recording is finished
function broadcastToClients(message: string) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}


function finalizeWavFile(tempPath: string) {
  try {
    const dataSize = fs.statSync(tempPath).size;
    const wavPath = path.join(audioStoragePath, `recorded_${Date.now()}.wav`);

    const header = createWavHeader({
      dataSize,
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
    });

    const wavFileStream = fs.createWriteStream(wavPath);
    wavFileStream.write(header);

    const rawData = fs.readFileSync(tempPath);
    wavFileStream.write(rawData);
    wavFileStream.end();

    fs.unlinkSync(tempPath);
    console.log(`WAV file created: ${wavPath}`);
  } catch (error) {
    console.error('Error processing WAV file:', error);
  }
}

interface WavHeaderParams {
  dataSize: number;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
}

function createWavHeader({ dataSize, sampleRate, channels, bitsPerSample }: WavHeaderParams): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20);  // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return header;
}

// API: Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Catch-all route for frontend
app.get('/*', (req, res) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  fs.readFile(path.join(__dirname, '../frontend/build/index.html'), 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Server Error');
    }

    // Replace placeholder with actual nonce
    const result = data.replace('content=""', `content="${nonce}"`);

    // Set CSP headers - make sure to use ${nonce} where needed
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'self';
       style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com;
       style-src-elem 'self' https://fonts.googleapis.com;
       font-src 'self' https://fonts.gstatic.com;
       script-src 'self' 'nonce-${nonce}';
       connect-src 'self' http://backend:5000;
       media-src 'self' http://backend:5000;`
    );
    res.send(result);
  });
});

// Global error handler
interface Error {
  message: string;
}

interface Request extends express.Request {}
interface Response extends express.Response {}
interface NextFunction extends express.NextFunction {}

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});