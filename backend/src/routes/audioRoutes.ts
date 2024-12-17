import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { finalizeWavFile } from '../utils/audioFileUtils';

const router = Router();
const audioStoragePath = path.join(__dirname, '../../public/audio-storage');

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, audioStoragePath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Ensure storage directory exists
if (!fs.existsSync(audioStoragePath)) fs.mkdirSync(audioStoragePath);

// API: Upload audio file
router.post('/upload-audio', upload.single('audio'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  console.log(`File uploaded: ${req.file.filename}`);
  res.status(200).json({ message: 'File uploaded successfully', fileName: req.file.filename });
});

// API: Get list of audio files
router.get('/audio-files', (req: Request, res: Response) => {
  fs.readdir(audioStoragePath, (err, files) => {
    if (err) {
      console.error('Error reading audio directory:', err);
      return res.status(500).json({ error: 'Unable to read audio directory' });
    }
    const audioFiles = files.filter((file) => file.endsWith('.wav') || file.endsWith('.mp3'));
    res.status(200).json(audioFiles);
  });
});

// API: Delete audio file
router.delete('/audio-files/:filename', (req: Request, res: Response) => {
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

export const audioRoutes = router;
