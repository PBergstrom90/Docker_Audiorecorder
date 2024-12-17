import fs from 'fs';
import path from 'path';

export const finalizeWavFile = (tempPath: string): void => {
  try {
    const dataSize = fs.statSync(tempPath).size;
    const wavPath = path.join(path.dirname(tempPath), `recorded_${Date.now()}.wav`);

    const header = createWavHeader({
      dataSize,
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
    });

    const wavFileStream = fs.createWriteStream(wavPath);
    wavFileStream.write(header);

    const rawData = fs.readFileSync(tempPath);
    wavFileStream.write(rawData);
    wavFileStream.end();

    fs.unlinkSync(tempPath);
    console.log(`WAV file created successfully: ${wavPath}`);
  } catch (error) {
    console.error('Error finalizing WAV file:', error);
  }
};

interface WavHeaderParams {
  dataSize: number;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
}

function createWavHeader({ dataSize, sampleRate, channels, bitsPerSample }: WavHeaderParams): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20);  // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return header;
}