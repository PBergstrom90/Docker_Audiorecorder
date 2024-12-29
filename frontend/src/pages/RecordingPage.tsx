import React, { useState, useEffect } from 'react';
import { debounce } from 'lodash';
import {
  Box,
  Typography,
  Container,
  Button,
  Slider,
  Snackbar,
  Alert,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import Chip from '@mui/material/Chip';

const RecordingPage: React.FC = () => {
  const [gain, setGain] = useState<number>(0.3);
  const [isAutomatic, setIsAutomatic] = useState<boolean>(false);

  // Tracks whether the device is actually recording
  const [isRecording, setIsRecording] = useState<boolean>(false);
  // Tracks whether we are *requesting* a start, so we can disable the button, etc.
  const [isRequestingStart, setIsRequestingStart] = useState<boolean>(false);

  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [pendingMode, setPendingMode] = useState<string | null>(null);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);

  const backendHost = '192.168.50.30';

  useEffect(() => {
    const fetchCurrentMode = async () => {
      try {
        const response = await fetch(`/api/current-mode`);
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

    const fetchDeviceStatus = async () => {
      try {
        const response = await fetch(`/api/status`);
        if (!response.ok) throw new Error('Failed to fetch ESP32 status');
        const data = await response.json();
        setIsOnline(data.isOnline);
      } catch (error) {
        console.error('Error fetching Device status:', error);
        setIsOnline(false);
      }
    };
    fetchDeviceStatus();
    const intervalId = setInterval(fetchDeviceStatus, 10000);

    // Setup WebSocket
    const ws = new WebSocket(`wss://192.168.50.30/ws/`);
    setWebSocket(ws);

    ws.onopen = () => {
      ws.send('TYPE:FRONTEND');
      console.log('WebSocket connected.');
    };

    ws.onmessage = (event) => {
      const message = event.data;
      console.log('WebSocket message received:', message);
      
      if (message.startsWith('ACK:')) {
        console.log(`${message}`);
        return;
      }

      if (message === 'START') {
        console.log('ESP32 confirms: START. Recording is active.');
        setIsRequestingStart(false);

        setIsRecording(true);
        handleSnackbarOpen('ESP32 confirms: Recording started!');
        return;
      }

      if (message === 'END') {
        console.log('ESP32 confirms: END. Recording is finished.');
        setIsRecording(false);
        handleSnackbarOpen('Recording finished successfully!');
        return;
      }

      if (message.startsWith('MODE:')) {
        const newMode = message.split(':')[1].trim();
        const isNewModeAuto = newMode === 'automatic';
        setIsAutomatic(isNewModeAuto);

        if (pendingMode === newMode) {
          handleSnackbarOpen(`Mode updated to ${newMode}.`);
        } else if (pendingMode && pendingMode !== newMode) {
          console.warn(
            `ERROR: Mismatch. pendingMode was ${pendingMode}, but got ${newMode}.`
          );
          handleSnackbarOpen(
            `Mode updated to ${newMode} (ERROR: mismatch from pendingMode).`
          );
        } else {
          console.warn('No pending mode set.');
          handleSnackbarOpen(`Mode updated to ${newMode}.`);
        }
        setPendingMode(null);
        return;
      }

      console.warn('Unknown WebSocket message received:', message);
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
      clearInterval(intervalId);
    };
  }, [backendHost]);

  const handleStartRecording = async () => {
    console.log('Requesting device to start recording...');
    setIsRequestingStart(true);
    try {
      const response = await fetch(`/esp32/start-record`, {
        method: 'GET',
      });
      if (!response.ok) throw new Error('Failed to start recording');
      const data = await response.json();
      console.log('ESP32 responded to start-record:', data);

      handleSnackbarOpen(
        'Requested manual recording from device. Awaiting confirmation...'
      );
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRequestingStart(false); // Re-enable the button if request fails
      handleSnackbarOpen('Failed to start recording!');
    }
  };

  const handleGainChange = debounce(async (event: Event, newValue: number | number[]) => {
    const newGain = newValue as number;
    setGain(newGain);
    console.log(`Updating gain to: ${newGain}`);
    try {
      const response = await fetch(`/esp32/set-gain?value=${newGain}`, {
        method: 'GET',
      });
      if (!response.ok) throw new Error('Failed to update gain');
      const data = await response.json();
      console.log('Gain updated:', data);
    } catch (error) {
      console.error('Error updating gain:', error);
      handleSnackbarOpen('Failed to update gain!');
    }
  }, 100);

  const handleModeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const mode = event.target.checked ? 'automatic' : 'manual';
    setPendingMode(mode);
    try {
      const response = await fetch(`/esp32/toggle-mode?mode=${mode}`, {
        method: 'GET',
      });
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
      <Box sx={{ marginTop: 4, textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom>
          Recording Page
        </Typography>
        <Typography variant="body1" sx={{ marginBottom: 4 }}>
          Use the buttons below to start recording and adjust gain as needed.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          marginBottom: 4,
        }}
      >
        {/* ESP32 Status Card */}
        <Card sx={{ width: '50%', textalign: 'center' }}>
          <CardContent>
            <CardActions sx={{ justifyContent: 'center' }}>
              <Typography variant="h6" gutterBottom>
                ESP32 Connection Status
              </Typography>
            </CardActions>
            <CardActions sx={{ justifyContent: 'center' }}>
              <Chip
                label={isOnline ? 'Online' : 'Offline'}
                color={isOnline ? 'success' : 'error'}
                variant="filled"
                sx={{ fontWeight: 'bold' }}
              />
            </CardActions>
          </CardContent>
        </Card>

        {/* Recording Card */}
        <Card sx={{ width: '50%', textalign: 'center' }}>
          <CardContent>
            <CardActions sx={{ justifyContent: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Recording Controls
              </Typography>
            </CardActions>
            <CardActions sx={{ justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<MicIcon />}
                onClick={handleStartRecording}
                disabled={
                  !isOnline ||
                  isAutomatic ||
                  isRecording ||
                  isRequestingStart ||
                  pendingMode !== null
                }
              >
                {isRecording
                  ? 'Recording in Progress'
                  : isRequestingStart
                  ? 'Requesting...'
                  : 'Start Recording'}
              </Button>
            </CardActions>
            <CardActions sx={{ justifyContent: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isAutomatic}
                    onChange={handleModeChange}
                    disabled={!isOnline || pendingMode !== null}
                    color="primary"
                  />
                }
                label={
                  pendingMode
                    ? `Switching to ${
                        pendingMode.charAt(0).toUpperCase() + pendingMode.slice(1)
                      } mode...`
                    : isAutomatic
                    ? 'Automatic Mode'
                    : 'Manual Mode'
                }
              />
            </CardActions>
          </CardContent>
        </Card>

        {/* Gain Adjustment Card */}
        <Card sx={{ width: '50%', textalign: 'center' }}>
          <CardContent>
            <CardActions sx={{ justifyContent: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Gain Adjustment
              </Typography>
            </CardActions>
            <Slider
              value={gain}
              min={0}
              max={1}
              step={0.01}
              onChange={handleGainChange}
              disabled={
                !isOnline || isAutomatic || isRecording || isRequestingStart || pendingMode !== null
              }
              aria-labelledby="gain-slider"
            />
            <Typography variant="body2">Current Gain: {gain.toFixed(2)}</Typography>
          </CardContent>
        </Card>
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