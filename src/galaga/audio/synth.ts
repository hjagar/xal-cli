import fs from 'node:fs';
import path from 'node:path';

const SAMPLE_RATE = 22050;

/**
 * Creates a valid RIFF/WAVE 8-bit Mono PCM buffer from an array of samples (0-255).
 */
export function buildWav(samples: Uint8Array): Buffer {
  const dataSize = samples.length;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // 'fmt ' Subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(1, 22);  // NumChannels (1 = Mono)
  buffer.writeUInt32LE(SAMPLE_RATE, 24); // SampleRate
  buffer.writeUInt32LE(SAMPLE_RATE, 28); // ByteRate (SampleRate * 1 channel * 1 byte/sample)
  buffer.writeUInt16LE(1, 32);  // BlockAlign
  buffer.writeUInt16LE(8, 34);  // BitsPerSample (8-bit)

  // 'data' Subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Copy samples
  Buffer.from(samples.buffer).copy(buffer, 44);

  return buffer;
}

/**
 * Procedural Laser sound: downward square-wave frequency sweep.
 */
export function generateLaserWav(): Buffer {
  const durationSec = 0.09;
  const totalSamples = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Uint8Array(totalSamples);

  let phase = 0;
  for (let i = 0; i < totalSamples; i++) {
    const progress = i / totalSamples;
    const freq = 900 * Math.pow(0.18, progress); // sweeps from 900Hz to ~160Hz
    const amplitude = 1 - progress; // linear decay

    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const wave = Math.sin(phase) > 0 ? 1 : -1;
    samples[i] = Math.floor(128 + wave * amplitude * 80);
  }

  return buildWav(samples);
}

/**
 * Procedural Explosion sound: filtered decaying noise.
 */
export function generateExplosionWav(): Buffer {
  const durationSec = 0.28;
  const totalSamples = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Uint8Array(totalSamples);

  let lastNoise = 0;
  for (let i = 0; i < totalSamples; i++) {
    const progress = i / totalSamples;
    const amplitude = Math.pow(1 - progress, 1.8);

    // Filtered noise (low-pass filter)
    const rawNoise = (Math.random() * 2 - 1);
    lastNoise = lastNoise * 0.75 + rawNoise * 0.25;

    samples[i] = Math.floor(128 + lastNoise * amplitude * 110);
  }

  return buildWav(samples);
}

/**
 * Procedural Power-up sound: ascending 4-note arpeggio (C5, E5, G5, C6).
 */
export function generatePowerUpWav(): Buffer {
  const durationSec = 0.16;
  const totalSamples = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Uint8Array(totalSamples);

  const notes = [523.25, 659.25, 783.99, 1046.5];
  const samplesPerNote = Math.floor(totalSamples / notes.length);

  let phase = 0;
  for (let i = 0; i < totalSamples; i++) {
    const noteIdx = Math.min(notes.length - 1, Math.floor(i / samplesPerNote));
    const freq = notes[noteIdx];
    const noteProgress = (i % samplesPerNote) / samplesPerNote;
    const amp = 1 - noteProgress * 0.4;

    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    // Hybrid square/triangle for arcade chime
    const sq = Math.sin(phase) > 0 ? 0.7 : -0.7;
    samples[i] = Math.floor(128 + sq * amp * 70);
  }

  return buildWav(samples);
}

/**
 * Procedural Shield deflection sound: harmonic ring with vibrato.
 */
export function generateShieldWav(): Buffer {
  const durationSec = 0.12;
  const totalSamples = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Uint8Array(totalSamples);

  let phase = 0;
  for (let i = 0; i < totalSamples; i++) {
    const progress = i / totalSamples;
    const vibrato = Math.sin((2 * Math.PI * 25 * i) / SAMPLE_RATE) * 30;
    const freq = 480 + vibrato;
    const amp = 1 - progress;

    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const wave = Math.sin(phase) + 0.5 * Math.sin(phase * 2);
    samples[i] = Math.floor(128 + (wave / 1.5) * amp * 75);
  }

  return buildWav(samples);
}

/**
 * Original 8-bit Chiptune Music track: A-minor space combat loop (~4.8 seconds).
 */
export function generateChiptuneMusicWav(): Buffer {
  const bpm = 140;
  const beatSec = 60 / bpm;
  const totalBeats = 16; // 4 bars in 4/4
  const durationSec = totalBeats * beatSec;
  const totalSamples = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Uint8Array(totalSamples);

  // A minor scale notes
  const A2 = 110.0;
  const E3 = 164.81;
  const G3 = 196.0;
  const A3 = 220.0;
  const C4 = 261.63;
  const D4 = 293.66;
  const E4 = 329.63;
  const G4 = 392.0;
  const A4 = 440.0;
  const C5 = 523.25;

  // 16-step bass line
  const bassSeq = [
    A2, A2, E3, A2,  G3, G3, D4, G3,
    A2, A2, E3, A2,  E3, G3, A3, E3
  ];

  // 16-step melody sequence
  const leadSeq = [
    A4, C5, E4, A4,  G4, E4, D4, G4,
    A4, C5, D4, E4,  G4, E4, C4, A3
  ];

  const samplesPerStep = Math.floor(totalSamples / 16);

  let leadPhase = 0;
  let bassPhase = 0;

  for (let i = 0; i < totalSamples; i++) {
    const step = Math.min(15, Math.floor(i / samplesPerStep));
    const stepProgress = (i % samplesPerStep) / samplesPerStep;

    // Bass Channel (Punchy square wave)
    const bassFreq = bassSeq[step];
    bassPhase += (2 * Math.PI * bassFreq) / SAMPLE_RATE;
    const bassAmp = Math.max(0, 1 - stepProgress * 0.8) * 0.45;
    const bassWave = Math.sin(bassPhase) > 0 ? 1 : -1;

    // Lead Channel (Duty cycle 25% pulse wave for authentic NES sound)
    const leadFreq = leadSeq[step];
    leadPhase += (2 * Math.PI * leadFreq) / SAMPLE_RATE;
    const leadAmp = Math.max(0, 1 - stepProgress * 0.4) * 0.35;
    const pulseNorm = (leadPhase % (2 * Math.PI)) / (2 * Math.PI);
    const leadWave = pulseNorm < 0.25 ? 1 : -1;

    // Hi-hat noise on 8th notes
    let noise = 0;
    if ((i % Math.floor(samplesPerStep / 2)) < SAMPLE_RATE * 0.02) {
      noise = (Math.random() * 2 - 1) * 0.15;
    }

    const mixed = bassWave * bassAmp + leadWave * leadAmp + noise;
    samples[i] = Math.floor(128 + Math.max(-1, Math.min(1, mixed)) * 105);
  }

  return buildWav(samples);
}

/**
 * Ensures all audio files are pre-generated on disk in `outDir`.
 */
export function ensureAudioAssets(outDir: string): Record<string, string> {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const files: Record<string, () => Buffer> = {
    laser: generateLaserWav,
    explosion: generateExplosionWav,
    powerup: generatePowerUpWav,
    shield: generateShieldWav,
    music: generateChiptuneMusicWav
  };

  const paths: Record<string, string> = {};
  for (const [name, generator] of Object.entries(files)) {
    const filePath = path.join(outDir, `${name}.wav`);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, generator());
    }
    paths[name] = filePath;
  }

  return paths;
}
