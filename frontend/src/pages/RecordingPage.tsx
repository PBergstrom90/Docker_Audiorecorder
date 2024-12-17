import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, Button, Slider, Snackbar, Alert } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';

const RecordingPage: React.FC = () => {
  const [gain, setGain] = useState<number>(0.3);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Connect to the existing ESP32 WebSocket server
    const ws = new WebSocket('ws://192.168.50.30:5001'); // Adjust to your ESP32 WebSocket IP and port
    setWebSocket(ws);

    ws.onopen = () => {
      ws.send('TYPE:FRONTEND'); // Send identification message
      console.log('WebSocket connected.');
    };

    ws.onmessage = (event) => {
      const message = event.data;
      console.log('WebSocket message received:', event.data);
      if (message.startsWith('ACK:')) {
        console.log('Server acknowledged connection.');
        console.log(`ACK Message: ${message}`);
      }
      if (event.data === 'END') {
        console.log('Recording finished successfully.');
        handleSnackbarOpen('Recording finished successfully!');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      handleSnackbarOpen('WebSocket error occurred!');
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected.');
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleStartRecording = async () => {
    console.log('Starting recording...');
    try {
      const response = await fetch('http://192.168.50.136/start-record', { method: 'GET' });
      if (!response.ok) throw new Error('Failed to start recording');
      const data = await response.json();
      console.log('Success:', data);
      handleSnackbarOpen('Recording started successfully!');
    } catch (error) {
      console.error('Error starting recording:', error);
      handleSnackbarOpen('Failed to start recording!');
    }
  };

  const handleGainChange = async (event: Event, newValue: number | number[]) => {
    const newGain = newValue as number;
    setGain(newGain);
    console.log(`Updating gain to: ${newGain}`);
    try {
      const response = await fetch(`http://192.168.50.136/set-gain?value=${newGain}`, { method: 'GET' });
      if (!response.ok) throw new Error('Failed to update gain');
      const data = await response.json();
      console.log('Gain updated:', data);
    } catch (error) {
      console.error('Error updating gain:', error);
      handleSnackbarOpen('Failed to update gain!');
    }
  };

  const handleSnackbarOpen = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Container>
      <Box sx={{ textAlign: 'center', marginTop: 4 }}>
        <Typography variant="h3" gutterBottom>
          Recording Page
        </Typography>
        <Typography variant="body1" sx={{ marginBottom: 4 }}>
          Use the buttons below to start recording and adjust gain as needed.
        </Typography>

        {/* Start Recording Button */}
        <Box sx={{ marginBottom: 4 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<MicIcon />}
            onClick={handleStartRecording}
          >
            Start Recording
          </Button>
        </Box>

        {/* Gain Adjustment Slider */}
        <Box sx={{ width: 300, margin: 'auto', marginBottom: 4 }}>
          <Typography variant="h6" gutterBottom>
            Adjust Gain
          </Typography>
          <Slider
            value={gain}
            min={0}
            max={1}
            step={0.01}
            onChange={handleGainChange}
            aria-labelledby="gain-slider"
          />
          <Typography variant="body2">
            Current Gain: {gain.toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {/* Snackbar */}
      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity="info" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default RecordingPage;
