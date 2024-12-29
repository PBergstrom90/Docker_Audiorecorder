import React from 'react';
import ReactAudioPlayer from 'react-audio-player';

interface AudioPlayerProps {
  file: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ file }) => {
  const audioUrl = `https://localhost:5000/audio-storage/${file}`;

  return (
    <div>
      <h3>Playing: {file}</h3>
      <ReactAudioPlayer
        src={audioUrl}
        controls
        preload="auto"
        autoPlay={false}
        onCanPlay={() => console.log(`Audio ready to play: ${file}`)}
        onError={(e) => console.error(`Failed to load audio: ${file}`, e)}
      />
    </div>
  );
};


export default AudioPlayer;
