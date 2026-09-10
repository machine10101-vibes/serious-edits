import { mixInto, normalizePeak } from './mix'

function noteHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

function env(t: number, attack: number, decay: number): number {
  if (t < 0) return 0
  if (t < attack) return t / attack
  return Math.exp(-(t - attack) / decay)
}

export function renderKick(sr: number, seconds = 0.45): Float32Array {
  const n = Math.floor(sr * seconds)
  const out = new Float32Array(n)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / sr
    const freq = 150 * Math.exp(-t * 18) + 38
    phase += (Math.PI * 2 * freq) / sr
    const click = Math.exp(-t * 90) * (Math.random() * 2 - 1) * 0.12
    out[i] = Math.sin(phase) * Math.exp(-t * 7.2) + click
  }
  normalizePeak(out, 1)
  return out
}

export function renderSnare(sr: number, seconds = 0.32): Float32Array {
  const n = Math.floor(sr * seconds)
  const out = new Float32Array(n)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / sr
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 14)
    phase += (Math.PI * 2 * 196) / sr
    const tone = Math.sin(phase) * Math.exp(-t * 10) * 0.45
    out[i] = noise * 0.7 + tone
  }
  normalizePeak(out, 0.9)
  return out
}

export function renderHat(sr: number, seconds = 0.12, open = false): Float32Array {
  const n = Math.floor(sr * (open ? 0.28 : seconds))
  const out = new Float32Array(n)
  let prev = 0
  const decay = open ? 8 : 38
  for (let i = 0; i < n; i++) {
    const t = i / sr
    const white = Math.random() * 2 - 1
    const hp = white - prev
    prev = white
    out[i] = hp * Math.exp(-t * decay)
  }
  normalizePeak(out, open ? 0.45 : 0.32)
  return out
}

function renderBassNote(sr: number, midi: number, seconds: number, slide = 0): Float32Array {
  const n = Math.floor(sr * seconds)
  const out = new Float32Array(n)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / sr
    const midiNow = midi + slide * (t / seconds)
    const hz = noteHz(midiNow)
    phase += (Math.PI * 2 * hz) / sr
    const wave = Math.sin(phase) + 0.28 * Math.sin(phase * 2) + 0.08 * Math.sin(phase * 3)
    out[i] = wave * env(t, 0.008, seconds * 0.42) * 0.55
  }
  return out
}

function renderPad(sr: number, chord: number[], seconds: number): Float32Array {
  const n = Math.floor(sr * seconds)
  const out = new Float32Array(n)
  for (const midi of chord) {
    let p1 = 0
    let p2 = 0
    for (let i = 0; i < n; i++) {
      const t = i / sr
      const hz = noteHz(midi)
      p1 += (Math.PI * 2 * hz) / sr
      p2 += (Math.PI * 2 * (hz * 1.003)) / sr
      const amp = env(t, 0.12, seconds * 0.7) * (0.5 + 0.5 * Math.sin((t * Math.PI) / seconds))
      out[i] += (Math.sin(p1) + Math.sin(p2)) * 0.12 * amp
    }
  }
  return out
}

function renderLead(sr: number, midi: number, seconds: number): Float32Array {
  const n = Math.floor(sr * seconds)
  const out = new Float32Array(n)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / sr
    const vibrato = 1 + Math.sin(t * 6.2) * 0.004
    phase += (Math.PI * 2 * noteHz(midi) * vibrato) / sr
    const wave = Math.sin(phase) + 0.18 * Math.sin(phase * 2)
    out[i] = wave * env(t, 0.01, seconds * 0.35) * 0.28
  }
  return out
}

export interface DemoStem {
  name: string
  color: string
  samples: Float32Array
  duration: number
  bpm: number
}

function houseSequence(sr: number, bpm: number, bars: number): Float32Array {
  const duration = (bars * 4 * 60) / bpm
  const n = Math.floor(sr * duration)
  const out = new Float32Array(n)
  const beat = 60 / bpm
  const kick = renderKick(sr)
  const snare = renderSnare(sr)
  const hat = renderHat(sr)
  const open = renderHat(sr, 0.12, true)
  for (let bar = 0; bar < bars; bar++) {
    for (let b = 0; b < 4; b++) {
      const t = (bar * 4 + b) * beat
      mixInto(out, kick, Math.floor(t * sr), 1)
      if (b === 1 || b === 3) mixInto(out, snare, Math.floor(t * sr), 0.85)
      mixInto(out, hat, Math.floor(t * sr), 0.55)
      mixInto(out, hat, Math.floor((t + beat / 2) * sr), 0.38)
      if (b === 3) mixInto(out, open, Math.floor((t + beat / 2) * sr), 0.5)
    }
  }
  normalizePeak(out, 0.95)
  return out
}

function bassSequence(sr: number, bpm: number, bars: number, roots: number[]): Float32Array {
  const duration = (bars * 4 * 60) / bpm
  const n = Math.floor(sr * duration)
  const out = new Float32Array(n)
  const beat = 60 / bpm
  for (let bar = 0; bar < bars; bar++) {
    const root = roots[bar % roots.length] ?? 45
    const note = renderBassNote(sr, root, beat * 1.6, bar % 4 === 3 ? -1 : 0)
    mixInto(out, note, Math.floor(bar * 4 * beat * sr), 1)
    const ghost = renderBassNote(sr, root + 12, beat * 0.28, 0)
    mixInto(out, ghost, Math.floor((bar * 4 * beat + beat * 2.5) * sr), 0.45)
  }
  normalizePeak(out, 0.86)
  return out
}

function musicSequence(sr: number, bpm: number, bars: number, chords: number[][], lead: number[]): Float32Array {
  const duration = (bars * 4 * 60) / bpm
  const n = Math.floor(sr * duration)
  const out = new Float32Array(n)
  const barLen = (4 * 60) / bpm
  for (let bar = 0; bar < bars; bar++) {
    const chord = chords[bar % chords.length] ?? [57, 60, 64]
    const pad = renderPad(sr, chord, barLen)
    mixInto(out, pad, Math.floor(bar * barLen * sr), 1)
  }
  const beat = 60 / bpm
  lead.forEach((midi, i) => {
    const t = i * beat
    mixInto(out, renderLead(sr, midi, beat * 0.9), Math.floor(t * sr), 1)
  })
  normalizePeak(out, 0.78)
  return out
}

export function buildDemoStems(sr = 44100): DemoStem[] {
  const bpm = 120
  const bars = 8
  const duration = (bars * 4 * 60) / bpm
  return [
    { name: 'House Drums', color: '#e07a5f', samples: houseSequence(sr, bpm, bars), duration, bpm },
    {
      name: 'Night Bass',
      color: '#d4a657',
      samples: bassSequence(sr, bpm, bars, [45, 45, 43, 43, 41, 41, 40, 40]),
      duration,
      bpm,
    },
    {
      name: 'Gold Keys',
      color: '#8b7cff',
      samples: musicSequence(
        sr,
        bpm,
        bars,
        [
          [57, 60, 64],
          [55, 59, 62],
          [53, 57, 60],
          [52, 55, 59],
        ],
        [72, 76, 79, 76, 72, 69, 67, 69, 72, 76, 74, 72, 69, 67, 64, 67],
      ),
      duration,
      bpm,
    },
    {
      name: 'Deck B Groove',
      color: '#3ee0c5',
      samples: grooveFrom(houseSequence(sr, bpm, bars), sr),
      duration,
      bpm,
    },
  ]
}

function grooveFrom(src: Float32Array, sr: number): Float32Array {
  const out = new Float32Array(src.length)
  for (let i = 0; i < src.length; i++) {
    const t = i / sr
    const swing = 0.15 * Math.sin(t * 8)
    out[i] = (src[i] ?? 0) * (0.85 + swing) * (i % 2 === 0 ? 1 : 0.92)
  }
  return out
}

export function samplesToBuffer(samples: Float32Array, sr: number): AudioBuffer {
  const buffer = new AudioBuffer({ length: samples.length, sampleRate: sr, numberOfChannels: 2 })
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i] ?? 0
    const width = 0.08 * Math.sin(i / 40)
    left[i] = s * (1 - width)
    right[i] = s * (1 + width) * 0.98
  }
  return buffer
}
