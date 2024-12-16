import React, { useState, useEffect } from 'react';
import AudioPlayer from '../components/AudioPlayer';
import {
  Box,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button, SelectChangeEvent,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const PlaybackPage: React.FC = () => {
  const [audioFiles, setAudioFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    fetchAudioFiles();
  }, []);

  const fetchAudioFiles = () => {
    fetch('/api/audio-files')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch audio files');
        }
        return response.json();
      })
      .then((data) => setAudioFiles(data))
      .catch((error) => console.error('Error fetching audio files:', error));
  };

  const handleFileSelect = (event: SelectChangeEvent<string>) => {
    setSelectedFile(event.target.value as string);
  };

  const handleDeleteFile = (file: string) => {
    fetch(`/api/audio-files/${file}`, {
      method: 'DELETE',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to delete audio file');
        }
        console.log(`${file} deleted successfully`);
        fetchAudioFiles();
        setSelectedFile(null);
      })
      .catch((error) => console.error('Error deleting audio file:', error));
  };

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h4" gutterBottom>
        Audio Playback
      </Typography>

      {audioFiles.length > 0 ? (
        <>
          <FormControl fullWidth sx={{ marginBottom: 4 }}>
            <InputLabel id="audio-file-dropdown-label"></InputLabel>
            <Select
              labelId="audio-file-dropdown-label"
              value={selectedFile || ''}
              onChange={handleFileSelect}
              displayEmpty
            >
              <MenuItem value="" disabled>
                -- Select an Audio file --
              </MenuItem>
              {audioFiles.map((file, index) => (
                <MenuItem key={index} value={file}>
                  {file}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedFile && (
            <Box sx={{ marginTop: 4 }}>
              <AudioPlayer file={selectedFile} />
              <Button
                startIcon={<DeleteIcon />}
                variant="contained"
                color="error"
                onClick={() => handleDeleteFile(selectedFile)}
                sx={{ marginTop: 2 }}
              >
                Delete File
              </Button>
            </Box>
          )}
        </>
      ) : (
        <Typography variant="body1">No audio files available.</Typography>
      )}
    </Box>
  );
};

export default PlaybackPage;
