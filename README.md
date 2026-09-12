# Serious Edits

A cinematic in-browser studio for music videos, songs, and DJ mixes. Import your own audio and video, drop generated visuals on a timeline, ride a two-deck mixer, and export the result.

No account. No server. Everything runs locally in the browser with the Web Audio API, Canvas, and MediaRecorder. The layout is built for desktop desks and phones.

## Features

- **Studio timeline** with snap, trim, move, razor cut, markers, loop in/out, and follow-playhead
- **Live mixer** — faders, EQ, mute, and solo take effect while the track is playing
- **Picture tools** — 16:9 / 9:16 / 1:1 output, film/neon/noir/sunset/VHS looks, beat-reactive motion, lower thirds
- **Score picture** places visuals on the beat grid; **Fit** loops video to the song; **Auto-fade** overlaps audio clips
- **Picture audio** stays muted by default so your mix sits under the video
- **DJ mode** with dual decks, sync, hot cues, beat jump, filter, EQ, and an equal-power crossfader
- **Tap tempo**, metronome, undo, and a shortcuts overlay (`?`)
- **Import** video, music, and images, or start from a built-in demo session
- **Export MP4** (video mix at YouTube / Reels / square size), **MP3**, WAV, or the project JSON

### Keyboard

Space play/pause · arrows skip beats (Shift = bar) · M marker · G metronome · F follow · L loop · E export · Z/Y undo/redo · R record · 1/2 decks

On a phone, **Export** and **More** stay in the top bar and **Play** sits in the transport. The timeline stays on screen. Use **Media / Mix / Clip / Export** for sheets. Tap **Video** or **Music**, then **+** to drop at the playhead.

## Run locally

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`). Chrome, Edge, or Safari recommended for MP4 export.

```bash
npm test
npm run build
npm run preview
```

## How to use

1. Click **Import video**, then **Import music** — or load **Demo**.
2. Press **Play**. Ride faders and EQ live. Pick a look and an aspect ratio for Reels or YouTube.
3. **Fit** to loop the picture across the song. Edit the lower third for artist/title cards.
4. Switch to **DJ**, sync a deck, set hot cues, then ride the crossfader.
5. Hit **Export** for MP4 (picture + mix) or MP3 (audio). Record is still there for a live take.

Media stays in this browser tab. Export anything you want to keep.

## Stack

Vite, React, TypeScript, Web Audio, Canvas 2D, MediaRecorder, lamejs.
