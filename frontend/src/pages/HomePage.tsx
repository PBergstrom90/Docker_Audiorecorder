import React from 'react';
import { Box, Typography, Container } from '@mui/material';

const HomePage: React.FC = () => {
  return (
    <Container>
      <Box sx={{ textAlign: 'center', marginTop: 4 }}>
        <Typography variant="h3" gutterBottom>
          Welcome to the Audio Recorder App
        </Typography>
        <Typography variant="body1">
          This app allows you to record, manage, and play your audio files with ease. Navigate
          through the pages to get started!
        </Typography>
      </Box>
    </Container>
  );
};

export default HomePage;
