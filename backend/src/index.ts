import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto'; // Import crypto for nonce generation

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend access
const corsOptions = {
  origin: 'http://localhost', // Update this if using a different frontend URL
  methods: ['GET', 'POST'],
  optionsSuccessStatus: 200,
};
app.use(require('cors')(corsOptions));

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

// API: Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

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