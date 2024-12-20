import React, { useState, useEffect } from 'react';
import { debounce } from 'lodash';
import { Box, Typography, Container, Button, Slider, Snackbar, Alert, Switch, FormControlLabel } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';

const RecordingPage: React.FC = () => {
  const [gain, setGain] = useState<number>(0.3);
  const [isAutomatic, setIsAutomatic] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [pendingMode, setPendingMode] = useState<string | null>(null);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const backendHost = '192.168.50.30';
  const esp32Ip = '192.168.50.136';

  useEffect(() => {
    const fetchCurrentMode = async () => {
      try {
        const response = await fetch(`http://${backendHost}/api/current-mode`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch current mode');
        const data = await response.json();
        console.log('Fetched current mode:', data.mode);
        setIsAutomatic(data.mode === 'automatic');
        setPendingMode(null);
      } catch (error) {
        console.error('Error fetching current mode:', error);
        handleSnackbarOpen('Failed to fetch current mode!');
      }
    };
    fetchCurrentMode();
    
    // Connect to the WebSocket server
    const ws = new WebSocket(`ws://${backendHost}:5001`);
    setWebSocket(ws);

    ws.onopen = () => {
      ws.send('TYPE:FRONTEND');
      console.log('WebSocket connected.');
    };

    ws.onmessage = (event) => {
      const message = event.data;
      console.log('WebSocket message received:', message);
    
      if (message === 'START') {
        if (isRecording) {
          console.warn('START message received, but recording is already active.');
        } else {
          console.log('Recording started successfully.');
          setIsRecording(true);
          handleSnackbarOpen('Recording started successfully!');
        }
      } else if (message === 'END') {
        if (!isRecording) {
          console.warn('END message received, but recording was not active.');
        } else {
          console.log('Recording finished successfully.');
          setIsRecording(false);
          handleSnackbarOpen('Recording finished successfully!');
        }
      } else if (message.startsWith('MODE:')) {
        const newMode = message.split(':')[1].trim();
        setIsAutomatic(newMode === 'automatic');
        if (pendingMode === newMode) {
          setPendingMode(null);
          handleSnackbarOpen(`Mode updated to ${newMode}.`);
        } else {
          console.warn(`Unexpected mode confirmation: ${newMode}`);
          setPendingMode(null);
        }
      } else {
        console.warn('Unknown WebSocket message received:', message);
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
      handleSnackbarOpen('Manual recording started successfully!');
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false); // Re-enable the button if the request fails
      handleSnackbarOpen('Failed to start recording!');
    }
  };

  const handleGainChange = debounce(async (event: Event, newValue: number | number[]) => {
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
  }, 100); // Wait for 100ms of inactivity before firing the function, to avoid spamming requests.

  const handleModeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const mode = event.target.checked ? 'automatic' : 'manual';
    setPendingMode(mode);
    try {
      const response = await fetch(`http://${esp32Ip}/toggle-mode?mode=${mode}`, { method: 'GET' });
      if (!response.ok) throw new Error('Failed to toggle mode');
      console.log(`Mode toggle request sent for ${mode}.`);
      handleSnackbarOpen(`Mode toggle request sent for ${mode}.`);
    } catch (error) {
      console.error('Error toggling mode:', error);
      setPendingMode(null);
      handleSnackbarOpen(`Failed to toggle mode: ${error.message}`);
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
              disabled={pendingMode !== null}
            />
            }
            label={
              pendingMode
                ? `Switching to ${pendingMode.charAt(0).toUpperCase() + pendingMode.slice(1)} mode...`
                : isAutomatic
                ? 'Automatic Mode'
                : 'Manual Mode'
            }
          />
        </Box>

        {/* Start Recording Button */}
        <Box sx={{ marginBottom: 4 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<MicIcon />}
            onClick={handleStartRecording}
            disabled={isAutomatic || isRecording || pendingMode !== null}
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
            disabled={isAutomatic || isRecording || pendingMode !== null}
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