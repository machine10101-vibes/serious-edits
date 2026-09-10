# Serious Edits

A cinematic in-browser studio for music videos, songs, and DJ mixes. Import your own audio and video, drop generated visuals on a timeline, ride a two-deck mixer, and export the result.

No account. No server. Everything runs locally in the browser with the Web Audio API, Canvas, and MediaRecorder. The layout is built for desktop desks and phones.

## Features

- **Studio timeline** with snap, trim, move, razor cut, markers, loop in/out, and follow-playhead
- **Live mixer** — faders, EQ, mute, and solo take effect while the track is playing
- **Picture tools** — 16:9 / 9:16 / 1:1 output, film/neon/noir/sunset/VHS looks, beat-reactive motion, lower thirds
- **Score picture** places visuals on the beat grid; **Auto-fade** overlaps audio clips
- **DJ mode** with dual decks, sync, hot cues, beat jump, filter, EQ, and an equal-power crossfader
- **Tap tempo**, metronome, undo, and a shortcuts overlay (`?`)
- **Import** audio, video, and images, or start from a built-in demo session
- **Export** a recorded video mix (WebM), a WAV bounce, or the project JSON

### Keyboard

Space play/pause · arrows skip beats (Shift = bar) · M marker · G metronome · F follow · L loop · Z/Y undo/redo · R record · 1/2 decks

On a phone, use the **Library / Mixer / Clip / Arrange** dock. Tap **+** in the library to drop media at the playhead.

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
2. Press **Play**. Ride faders and EQ live. Pick a look and an aspect ratio for Reels or YouTube.
3. **Score** to cut visuals to the beat. Edit the lower third for artist/title cards.
4. Switch to **DJ**, sync a deck, set hot cues, then ride the crossfader.
5. Hit **Record** to capture the picture and the mix, or **WAV** for an audio bounce.

Media stays in this browser tab. Export anything you want to keep.

## Stack

Vite, React, TypeScript, Web Audio, Canvas 2D, MediaRecorder.
