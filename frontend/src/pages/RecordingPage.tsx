import React from 'react';
import { Box, Typography, Container, Button } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';

const RecordingPage: React.FC = () => {
  const handleStartRecording = () => {
    console.log('Recording started');
  };

  const handleStopRecording = () => {
    console.log('Recording stopped');
  };

  return (
    <Container>
      <Box sx={{ textAlign: 'center', marginTop: 4 }}>
        <Typography variant="h3" gutterBottom>
          Recording Page
        </Typography>
        <Typography variant="body1" sx={{ marginBottom: 4 }}>
          Use the buttons below to start or stop recording your audio files.
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<MicIcon />}
            onClick={handleStartRecording}
            sx={{ marginRight: 2 }}
          >
            Start Recording
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<StopIcon />}
            onClick={handleStopRecording}
          >
            Stop Recording
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default RecordingPage;
