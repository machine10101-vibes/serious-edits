# Serious Edits

A cinematic in-browser studio for music videos, songs, and DJ mixes. Import your own audio and video, drop generated visuals on a timeline, ride a two-deck mixer, and export the result.

No account. No server. Everything runs locally in the browser with the Web Audio API, Canvas, and MediaRecorder.

## Features

- **Studio timeline** with multiple audio and visual tracks, snap-to-grid, trim, move, and razor cut
- **Mixer** with per-track EQ, pan, mute/solo, delay, and a master filter / reverb / delay / drive rack
- **DJ mode** with dual decks, cue points, pitch, filter, 3-band EQ, looping, and an equal-power crossfader
- **Video + generative visuals** (aurora, pulse rings, spectrum, embers, title cards, strobe, tunnel, horizon)
- **Import** audio, video, and images, or start from a built-in demo session
- **Export** a recorded video mix (WebM), a WAV bounce, or the project JSON
- Keyboard shortcuts: Space play/pause, S stop, R record, L loop, Delete, ⌘/Ctrl+B split, ⌘/Ctrl+D duplicate, 1/2 deck play

## Run locally

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`). Chrome, Edge, or Firefox recommended.

```bash
npm test
npm run build
npm run preview
```

## How to use

1. Click **Demo** to load a 120 BPM house session, or drop files onto the window.
2. Press **Play**. Adjust faders, EQ, and master effects while the program output renders.
3. Drag library clips onto the timeline. Use **Cut** or Split to slice. Inspect a clip to fade, blend, or retitle it.
4. Switch to **DJ**, load tracks onto decks A and B, then ride the crossfader.
5. Hit **Record** to capture the picture and the mix, or **WAV** for an audio bounce.

Media stays in this browser tab. Export anything you want to keep.

## Stack

Vite, React, TypeScript, Web Audio, Canvas 2D, MediaRecorder.
