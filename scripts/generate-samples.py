"""Generate three original ambient sample MP3s; no third-party recordings."""
import math
import os
import shutil
import struct
import subprocess
import tempfile
import wave
from pathlib import Path
from own_collections import LinkedList

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "apps" / "web" / "public" / "samples"
OUTPUT.mkdir(parents=True, exist_ok=True)
FFMPEG = os.environ.get('FFMPEG_BINARY') or shutil.which('ffmpeg')
if not FFMPEG:
    raise SystemExit('Set FFMPEG_BINARY to your ffmpeg executable to regenerate the already bundled samples.')
RATE = 22050
DURATION = 32
SESSIONS = LinkedList()
SESSIONS.append(("orbit", "Órbita", LinkedList().append(130.81).append(164.81).append(196.00).append(261.63)))
SESSIONS.append(("liquid-light", "Luz líquida", LinkedList().append(146.83).append(174.61).append(220.00).append(293.66)))
SESSIONS.append(("blue-hour", "La hora azul", LinkedList().append(110.00).append(130.81).append(164.81).append(220.00)))
with tempfile.TemporaryDirectory() as temporary:
    for slug, title, notes in SESSIONS:
        path = Path(temporary) / f"{slug}.wav"
        frames = bytearray()
        for index in range(RATE * DURATION):
            t = index / RATE
            envelope = min(1, t / 2.5, (DURATION - t) / 3)
            value = sum(math.sin(2 * math.pi * frequency * t + .15 * math.sin(t * .2)) * (.8 + .2 * math.sin(t * .3 + n)) for n, frequency in enumerate(notes)) / 4
            shimmer = math.sin(2 * math.pi * notes.at(3) * 2 * t) * .07 * (.5 + .5 * math.sin(t * .7))
            frames.extend(struct.pack('<h', int((value + shimmer) * envelope * 8500)))
        with wave.open(str(path), 'wb') as sound:
            sound.setnchannels(1); sound.setsampwidth(2); sound.setframerate(RATE); sound.writeframes(frames)
        subprocess.run((str(FFMPEG), '-y', '-loglevel', 'error', '-i', str(path), '-codec:a', 'libmp3lame', '-b:a', '96k', '-metadata', f'title={title}', '-metadata', 'artist=Auralis · Audio de muestra', '-metadata', 'album=Sesiones de muestra', str(OUTPUT / f'{slug}.mp3')), check=True)
print('Three original ambient MP3 samples generated (32 seconds each).')
