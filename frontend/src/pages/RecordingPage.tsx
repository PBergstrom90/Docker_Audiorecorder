import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, Button, Slider, Snackbar, Alert, Switch, FormControlLabel } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';

const RecordingPage: React.FC = () => {
  const [gain, setGain] = useState<number>(0.3);
  const [isAutomatic, setIsAutomatic] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const backendHost = '192.168.50.30';
  const esp32Ip = '192.168.50.136';

  useEffect(() => {
    // Connect to the WebSocket server
    const ws = new WebSocket(`ws://${backendHost}:5001`);
    setWebSocket(ws);

    ws.onopen = () => {
      ws.send('TYPE:FRONTEND'); // Send identification message
      console.log('WebSocket connected.');
    };

    ws.onmessage = (event) => {
      const message = event.data;
      console.log('WebSocket message received:', message);

      if (event.data === 'END') {
        console.log('Recording finished successfully.');
        setIsRecording(false); // Enable the Start Recording button
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
    setIsRecording(true); // Disable the Start Recording button
    try {
      const response = await fetch(`http://${esp32Ip}/start-record`, { method: 'GET' });
      if (!response.ok) throw new Error('Failed to start recording');
      const data = await response.json();
      console.log('Success:', data);
      handleSnackbarOpen('Recording started successfully!');
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false); // Re-enable the button if the request fails
      handleSnackbarOpen('Failed to start recording!');
    }
  };

  const handleGainChange = async (event: Event, newValue: number | number[]) => {
    const newGain = newValue as number;
    setGain(newGain);
    console.log(`Updating gain to: ${newGain}`);
    try {
      const response = await fetch(`http://${esp32Ip}/set-gain?value=${newGain}`, { method: 'GET' });
      if (!response.ok) throw new Error('Failed to update gain');
      const data = await response.json();
      console.log('Gain updated:', data);
    } catch (error) {
      console.error('Error updating gain:', error);
      handleSnackbarOpen('Failed to update gain!');
    }
  };

  const handleModeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const mode = event.target.checked ? 'automatic' : 'manual';
    setIsAutomatic(event.target.checked);
    try {
        const response = await fetch(`http://${esp32Ip}/toggle-mode?mode=${mode}`, { method: 'GET' });
        if (!response.ok) throw new Error('Failed to toggle mode');
        const data = await response.json();
        console.log('Mode toggled:', data);
        handleSnackbarOpen(`Switched to ${mode.charAt(0).toUpperCase() + mode.slice(1)} mode!`);
    } catch (error) {
        console.error('Error toggling mode:', error);
        handleSnackbarOpen('Failed to toggle mode!');
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

        {/* Automatic/Manual Mode Toggle */}
        <Box sx={{ marginBottom: 4 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isAutomatic}
                onChange={handleModeChange}
                name="mode-switch"
                color="primary"
              />
            }
            label={isAutomatic ? 'Automatic Mode' : 'Manual Mode'}
          />
        </Box>

        {/* Start Recording Button */}
        <Box sx={{ marginBottom: 4 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<MicIcon />}
            onClick={handleStartRecording}
            disabled={isAutomatic || isRecording}
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
            disabled={isAutomatic || isRecording}
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