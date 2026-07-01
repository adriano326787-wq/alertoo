// Gera assets/sounds/radar-beep.wav — 3 beeps curtos (880Hz, ~120ms cada,
// com 80ms de silêncio entre eles), 16-bit PCM mono @ 22050Hz.
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', '..', 'assets', 'sounds', 'radar-beep.wav');

const SAMPLE_RATE = 22050;
const BEEP_FREQ = 880; // Hz
const BEEP_MS = 120;
const GAP_MS = 80;
const BEEP_COUNT = 3;
const AMPLITUDE = 0.5; // evita clipping

const beepSamples = Math.round(SAMPLE_RATE * (BEEP_MS / 1000));
const gapSamples = Math.round(SAMPLE_RATE * (GAP_MS / 1000));
const totalSamples = BEEP_COUNT * beepSamples + (BEEP_COUNT - 1) * gapSamples;

const samples = new Int16Array(totalSamples);
let idx = 0;
for (let b = 0; b < BEEP_COUNT; b++) {
  for (let i = 0; i < beepSamples; i++) {
    // fade in/out curto para evitar "click"
    const fade = Math.min(i, beepSamples - i, 200) / 200;
    const v = Math.sin((2 * Math.PI * BEEP_FREQ * i) / SAMPLE_RATE) * AMPLITUDE * fade;
    samples[idx++] = Math.round(v * 32767);
  }
  if (b < BEEP_COUNT - 1) {
    idx += gapSamples; // silêncio (zeros)
  }
}

// WAV header (PCM 16-bit mono)
const dataSize = samples.length * 2;
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + dataSize, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);       // fmt chunk size
header.writeUInt16LE(1, 20);        // PCM
header.writeUInt16LE(1, 22);        // mono
header.writeUInt32LE(SAMPLE_RATE, 24);
header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
header.writeUInt16LE(2, 32);        // block align
header.writeUInt16LE(16, 34);       // bits per sample
header.write('data', 36);
header.writeUInt32LE(dataSize, 40);

const dataBuf = Buffer.from(samples.buffer);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, Buffer.concat([header, dataBuf]));
console.log(`OK: ${outPath} (${(header.length + dataBuf.length)} bytes)`);
