import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { LinkedSequence } from '@auralis/playlist-core';

interface SampleSession {
  slug: string;
  title: string;
  notes: LinkedSequence<number>;
}

const sampleRate = 22_050;
const durationSeconds = 32;
const amplitude = 8_500;
const outputDirectory = resolve('apps/web/public/samples');
const sessions = new LinkedSequence<SampleSession>()
  .append({ slug: 'orbit', title: 'Órbita', notes: new LinkedSequence<number>().append(130.81).append(164.81).append(196).append(261.63) })
  .append({ slug: 'liquid-light', title: 'Luz líquida', notes: new LinkedSequence<number>().append(146.83).append(174.61).append(220).append(293.66) })
  .append({ slug: 'blue-hour', title: 'La hora azul', notes: new LinkedSequence<number>().append(110).append(130.81).append(164.81).append(220) });

function findExecutable(name: string): string | undefined {
  const candidates = process.platform === 'win32' ? [name, `${name}.exe`, `${name}.cmd`] : [name];
  for (const directory of (process.env.PATH ?? '').split(delimiter)) {
    for (const candidate of candidates) {
      const path = join(directory, candidate);
      if (existsSync(path)) return path;
    }
  }
  return undefined;
}

function createWave(notes: LinkedSequence<number>): Buffer {
  const shimmerFrequency = notes.at(3);
  if (shimmerFrequency === undefined) throw new Error('A sample session must provide four notes.');
  const sampleCount = sampleRate * durationSeconds;
  const wave = Buffer.alloc(44 + sampleCount * 2);
  wave.write('RIFF', 0);
  wave.writeUInt32LE(wave.length - 8, 4);
  wave.write('WAVE', 8);
  wave.write('fmt ', 12);
  wave.writeUInt32LE(16, 16);
  wave.writeUInt16LE(1, 20);
  wave.writeUInt16LE(1, 22);
  wave.writeUInt32LE(sampleRate, 24);
  wave.writeUInt32LE(sampleRate * 2, 28);
  wave.writeUInt16LE(2, 32);
  wave.writeUInt16LE(16, 34);
  wave.write('data', 36);
  wave.writeUInt32LE(sampleCount * 2, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const envelope = Math.min(1, time / 2.5, (durationSeconds - time) / 3);
    let value = 0;
    let noteIndex = 0;
    for (const frequency of notes) {
      value += Math.sin(2 * Math.PI * frequency * time + 0.15 * Math.sin(time * 0.2))
        * (0.8 + 0.2 * Math.sin(time * 0.3 + noteIndex));
      noteIndex += 1;
    }
    value /= notes.length;
    const shimmer = Math.sin(2 * Math.PI * shimmerFrequency * 2 * time)
      * 0.07 * (0.5 + 0.5 * Math.sin(time * 0.7));
    wave.writeInt16LE(Math.trunc((value + shimmer) * envelope * amplitude), 44 + index * 2);
  }
  return wave;
}

const ffmpeg = process.env.FFMPEG_BINARY || findExecutable('ffmpeg');
if (!ffmpeg) {
  throw new Error('Set FFMPEG_BINARY to your ffmpeg executable to regenerate the bundled sample MP3 files.');
}

mkdirSync(outputDirectory, { recursive: true });
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'auralis-samples-'));
try {
  for (const session of sessions) {
    const wavePath = join(temporaryDirectory, `${session.slug}.wav`);
    const mp3Path = join(outputDirectory, `${session.slug}.mp3`);
    writeFileSync(wavePath, createWave(session.notes));
    const result = spawnSync(ffmpeg, [
      '-y', '-loglevel', 'error', '-i', wavePath, '-codec:a', 'libmp3lame', '-b:a', '96k',
      '-metadata', `title=${session.title}`, '-metadata', 'artist=Auralis · Audio de muestra',
      '-metadata', 'album=Sesiones de muestra', mp3Path,
    ], { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`FFmpeg failed to create ${session.slug}.mp3.`);
  }
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

console.log('Three original ambient MP3 samples generated (32 seconds each).');
