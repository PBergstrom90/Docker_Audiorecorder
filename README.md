# Docker Audiorecorder

A full-stack audio recording application running in Docker containers. The project includes a backend (Node.js) for handling API requests, WebSocket communication, and audio file storage, and a frontend (React) for user interaction. The system enables secure audio streaming, recording management, and playback.

This project is designed to work seamlessly with the ESP32 Audiorecorder, which can be found in this repository: [ESP32_Audiorecorder](https://github.com/PBergstrom90/ESP32_Audiorecorder).

## Features

### Backend
- **REST API**: Manage audio recordings (upload, list, delete).
- **WebSocket Communication**: Real-time updates and mode management.
- **Audio Storage**: Save audio files securely.
- **Health Check**: Ensures the backend service is running.
- **Secure Communication**: Uses HTTPS with mTLS for secure interactions.

### Frontend
- **Responsive UI**: Built with React and Material-UI.
- **Recording Management**: Start/stop recording, toggle modes, and adjust gain.
- **Playback**: Play and delete recorded audio files.
- **Settings**: Switch themes (light/dark mode) and customize preferences.

### Deployment
- Fully containerized with Docker Compose.
- Health checks for both frontend and backend services.
- Integrated HTTPS with TLS certificates.

## System Architecture

The application is structured into two main services:

1. **Frontend**:
   - React application served by Nginx.
   - Provides user interaction through a clean and intuitive interface.
   - Communicates with the backend for API and WebSocket features.

2. **Backend**:
   - Node.js server handling API and WebSocket communication.
   - Manages audio file storage and device status.

## Setup and Configuration

### Prerequisites
- Docker and Docker Compose installed.
- Valid TLS certificates (`server.crt`, `server.key`, `ca.crt`).

### Folder Structure
```
Docker_Audiorecorder/
├── backend/
│   ├── src/
│   ├── public/audio-storage/
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── public/
│   └── Dockerfile
├── certs/
│   ├── server.crt
│   ├── server.key
│   └── ca.crt
├── docker-compose.yml
└── README.md
```

### Docker Compose Configuration
- **Network**: `audiorecorder_network` for inter-service communication.
- **Ports**:
  - Backend: `5000` (REST API), `5001` (WebSocket).
  - Frontend: `80` (HTTP), `443` (HTTPS).

### Environment Variables
- `backend/src/config/corsConfig.ts`: Configure allowed origins and credentials.

### Setup Steps
1. Clone the repository and navigate to the project directory.
2. Place your TLS certificates in the `certs/` directory.
3. Build and run the containers:
   ```bash
   docker-compose up --build
   ```
4. Access the application:
   - Frontend: `https://localhost` or `https://<server-ip>`.
   - Backend: `https://localhost:5000`.

## Usage

### Backend API Endpoints
- **GET `/health`**: Returns backend health status.
- **POST `/api/upload-audio`**: Upload an audio file.
- **GET `/api/audio-files`**: List all stored audio files.
- **DELETE `/api/audio-files/:filename`**: Delete a specific audio file.
- **GET `/api/current-mode`**: Retrieve the current mode (automatic/manual).
- **GET `/api/status`**: Check ESP32 device status.

### Frontend Pages
- **Home**: Overview of application features.
- **Recording**: Manage recording sessions and adjust gain.
- **Playback**: Play and delete audio files.
- **Settings**: Configure theme and application preferences.

### Incoming WebSocket Messages from Device

The backend receives the following WebSocket messages from the connected ESP32 device. These messages trigger actions or provide status updates:

- **`START`**: 
  - **Description**: Indicates the ESP32 has started a recording session.
  - **Backend Actions**: 
    - Marks the recording as active.
    - Broadcasts the `START` message to all connected frontend clients for real-time updates.
  - **Use Case**: Enables the frontend to display a "Recording in Progress" status and temporarily disable the user interface to prevent accidental actions during recording.

- **`END`**: 
  - **Description**: Indicates the ESP32 has completed a recording session.
  - **Backend Actions**: 
    - Finalizes the recording by saving the audio data.
    - Broadcasts the `END` message to notify all frontend clients.
  - **Use Case**: Updates the frontend to show that the recording has ended and the file is ready for playback.

- **`MODE:<automatic|manual>`**: 
  - **Description**: Indicates a change in the ESP32's operational mode.
  - **Backend Actions**: 
    - Updates the current mode (`automatic` or `manual`) in the backend.
    - Broadcasts the mode change to all connected frontend clients.
  - **Use Case**: Ensures the frontend reflects the ESP32's current mode, showing whether it is set to automatically start recordings or await manual triggers.

## Troubleshooting

### Common Issues
- **Containers not starting**: 
  - Check logs with `docker-compose logs`.
  - Ensure Docker is running and ports are not in use by other applications.
- **Certificate issues**: 
  - Verify that `server.crt`, `server.key`, and `ca.crt` are in the `certs/` directory.
  - Replace self-signed certificates with trusted ones for production.
  - For local testing:
    - Accept browser warnings manually.
    - Add self-signed certificates to the system's trusted store.
- **Backend API not reachable**: 
  - Confirm the backend is running with `docker-compose ps`.
  - Test reachability using:
    ```bash
    curl -k https://localhost:5000/health
    ```
- **WebSocket connection issues**: 
  - Check that port `5001` is open and accessible.
  - Review backend logs with `docker logs audiorecorder-backend`.
- **Audio files not saving**: 
  - Verify permissions for the storage folder:
    ```bash
    chmod -R 755 ./backend/public/audio-storage
    ```

## Future Improvements

- **Audio Processing**: Add noise reduction, gain adjustment, and real-time visualizations.
- **Security**: Integrate OAuth2, role-based access, and automated certificate renewal.
- **File Management**: Support additional audio formats, cloud storage, and batch operations.
- **Scalability**: Enhance support for multiple devices and add device monitoring.
- **Frontend**: Improve mobile responsiveness, accessibility, and personalized dashboards.
- **Performance**: Implement system metrics and real-time monitoring for connected devices.

## License

[MIT License](LICENSE)