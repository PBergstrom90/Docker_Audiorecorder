import React from 'react';
import { SelectChangeEvent } from '@mui/material';
import {
  Box,
  Typography,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';

interface SettingsPageProps {
  themeMode: 'light' | 'dark';
  setThemeMode: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ themeMode, setThemeMode }) => {
  const [notifications, setNotifications] = React.useState<boolean>(true);

  const handleThemeChange = (event: SelectChangeEvent<string>) => {
    setThemeMode(event.target.value as 'light' | 'dark');
  };

  const handleNotificationToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNotifications(event.target.checked);
  };

  return (
    <Container>
      <Box sx={{ marginTop: 4 }}>
        <Typography variant="h3" gutterBottom>
          Settings
        </Typography>
        <FormControl fullWidth sx={{ marginBottom: 4 }}>
          <InputLabel id="theme-select-label">Theme</InputLabel>
          <Select
            labelId="theme-select-label"
            value={themeMode}
            onChange={handleThemeChange}
          >
            <MenuItem value="light">Light</MenuItem>
            <MenuItem value="dark">Dark</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Switch
              checked={notifications}
              onChange={handleNotificationToggle}
              color="primary"
            />
          }
          label="Enable Notifications"
        />
      </Box>
    </Container>
  );
};

export default SettingsPage;
