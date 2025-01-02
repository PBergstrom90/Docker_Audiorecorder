import React, { useState, useEffect } from 'react';
import AudioPlayer from '../components/AudioPlayer';
import {
  Box,
  Typography,
  MenuItem,
  Select,
  FormControl,
  Button,
  SelectChangeEvent,
  Grid,
  Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const PlaybackPage: React.FC = () => {
  const [audioFiles, setAudioFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [filesByDate, setFilesByDate] = useState<Record<string, string[]>>({});

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
      .then((data) => {
        setAudioFiles(data);
        groupFilesByDate(data);
      })
      .catch((error) => console.error('Error fetching audio files:', error));
  };

  const groupFilesByDate = (files: string[]) => {
    const grouped = files.reduce<Record<string, string[]>>((acc, file) => {
      const dateMatch = file.match(/\d{4}-\d{2}-\d{2}/);
      const date = dateMatch ? dateMatch[0] : 'Unknown';
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(file);
      return acc;
    }, {});

    const sortedGrouped = Object.keys(grouped)
      .sort()
      .reduce<Record<string, string[]>>((sortedAcc, date) => {
        sortedAcc[date] = grouped[date];
        return sortedAcc;
      }, {});

    setFilesByDate(sortedGrouped);
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

    {/* Dropdown for Audiofiles */}
      {audioFiles.length > 0 ? (
        <>
          <FormControl fullWidth sx={{ marginBottom: 4 }}>
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

          {/* Summary over all recordings the bottom */}
          <Box sx={{ marginTop: 8 }}>
            <Typography variant="h6" gutterBottom>
              Recordings Summary
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(filesByDate).map(([date, files]) => (
                <Grid item xs={12} sm={6} md={4} key={date}>
                  <Paper sx={{ padding: 2, textAlign: 'center' }}>
                    <Typography variant="body1" fontWeight="bold">
                      {date}
                    </Typography>
                    <Typography variant="body2">{files.length} recording(s)</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </>
      ) : (
        <Typography variant="body1">No audio files available.</Typography>
      )}
    </Box>
  );
};

export default PlaybackPage;
