export type AspectRatio = '16:9' | '9:16' | '1:1'
export type LookId = 'clean' | 'cinematic' | 'neon' | 'noir' | 'sunset' | 'vhs'
export type MobilePanel = 'library' | 'mixer' | 'clip'
export type StudioMode = 'studio' | 'dj'
export type TrackKind = 'audio' | 'video'
export type MediaKind = 'audio' | 'video' | 'image' | 'visual'
export type Tool = 'pointer' | 'razor'
export type BlendMode =
  | 'source-over'
  | 'screen'
  | 'multiply'
  | 'overlay'
  | 'lighten'
  | 'plus-lighter'

export type FitMode = 'cover' | 'contain'

export type VisualKind =
  | 'aurora'
  | 'pulse'
  | 'spectrum'
  | 'particles'
  | 'title'
  | 'strobe'
  | 'tunnel'
  | 'horizon'
  | 'waveform'

export interface EqState {
  low: number
  mid: number
  high: number
}

export interface Marker {
  id: string
  time: number
  label: string
}

export interface MediaAsset {
  id: string
  name: string
  kind: MediaKind
  duration: number
  color: string
  url?: string
  mime?: string
  peaks?: number[]
  visual?: VisualKind
  bpm?: number
  hasAudio: boolean
}

export interface Clip {
  id: string
  trackId: string
  mediaId: string
  start: number
  duration: number
  offset: number
  gain: number
  fadeIn: number
  fadeOut: number
  playbackRate: number
  opacity: number
  blend: BlendMode
  scale: number
  x: number
  y: number
  hue: number
  text: string
  audioEnabled: boolean
  fit: FitMode
  loop: boolean
}

export interface Track {
  id: string
  name: string
  kind: TrackKind
  volume: number
  pan: number
  muted: boolean
  solo: boolean
  eq: EqState
  filter: number
  delay: number
  color: string
}

export interface Deck {
  mediaId: string | null
  playing: boolean
  position: number
  rate: number
  volume: number
  eq: EqState
  filter: number
  cue: number
  loop: boolean
  hotCues: number[]
}

export interface Project {
  name: string
  bpm: number
  duration: number
  aspect: AspectRatio
  look: LookId
  reactive: boolean
  subtitle: string
  metronome: boolean
}

export interface Toast {
  id: string
  title: string
  body?: string
}

export const BLEND_MODES: { id: BlendMode; label: string }[] = [
  { id: 'source-over', label: 'Normal' },
  { id: 'screen', label: 'Screen' },
  { id: 'multiply', label: 'Multiply' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'lighten', label: 'Lighten' },
  { id: 'plus-lighter', label: 'Add' },
]

export const VISUALS: { id: VisualKind; name: string; color: string }[] = [
  { id: 'aurora', name: 'Aurora', color: '#3ee0c5' },
  { id: 'pulse', name: 'Pulse Rings', color: '#d4a657' },
  { id: 'spectrum', name: 'Spectrum', color: '#8b7cff' },
  { id: 'particles', name: 'Embers', color: '#e07a5f' },
  { id: 'title', name: 'Title Card', color: '#f0d29a' },
  { id: 'strobe', name: 'Strobe', color: '#ff5a7a' },
  { id: 'tunnel', name: 'Tunnel', color: '#81b29a' },
  { id: 'horizon', name: 'Horizon', color: '#6ec3f0' },
  { id: 'waveform', name: 'Waveform', color: '#f0d29a' },
]

export const ASPECTS: { id: AspectRatio; label: string }[] = [
  { id: '16:9', label: 'YouTube' },
  { id: '9:16', label: 'Reels' },
  { id: '1:1', label: 'Square' },
]

export const LOOKS: { id: LookId; label: string }[] = [
  { id: 'clean', label: 'Clean' },
  { id: 'cinematic', label: 'Film' },
  { id: 'neon', label: 'Neon' },
  { id: 'noir', label: 'Noir' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'vhs', label: 'VHS' },
]
