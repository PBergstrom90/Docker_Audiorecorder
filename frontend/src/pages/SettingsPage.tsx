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

  const handleThemeChange = (event: SelectChangeEvent<string>) => {
    setThemeMode(event.target.value as 'light' | 'dark');
  };

  return (
    <Container>
      <Box sx={{ marginTop: 4 }}>
        <Typography variant="h3" gutterBottom>
          Settings
        </Typography>
        <FormControl fullWidth sx={{ marginBottom: 4 }}>
          <Select
            labelId="theme-select-label"
            value={themeMode}
            onChange={handleThemeChange}
          >
            <MenuItem value="light">Light</MenuItem>
            <MenuItem value="dark">Dark</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Container>
  );
};

export default SettingsPage;
