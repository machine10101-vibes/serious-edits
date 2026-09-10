import { useSyncExternalStore } from 'react'
import { engine, isAudioFile, isImageFile, isVideoFile, peaksFromBuffer } from './engine/studioEngine'
import { uid } from './lib/id'
import { anySolo, clipEnd, projectLength, splitClip, trimClip } from './lib/clips'
import { buildDemoStems, samplesToBuffer } from './lib/demoAudio'
import { clamp } from './lib/mix'
import { clampZoom, snapTime } from './lib/time'
import { computePeaks } from './lib/waveform'
import type {
  Clip,
  Deck,
  MediaAsset,
  Project,
  StudioMode,
  Toast,
  Tool,
  Track,
} from './types'
import { VISUALS } from './types'

export interface StudioState {
  project: Project
  tracks: Track[]
  clips: Clip[]
  assets: MediaAsset[]
  mode: StudioMode
  tool: Tool
  selectedClipId: string | null
  selectedTrackId: string | null
  selectedMediaId: string | null
  pixelsPerSecond: number
  scrollX: number
  snap: boolean
  loop: boolean
  loopStart: number
  loopEnd: number
  playing: boolean
  time: number
  recording: boolean
  master: { volume: number; filter: number; reverb: number; delay: number; drive: number }
  deckA: Deck
  deckB: Deck
  xfader: number
  toasts: Toast[]
  busy: string | null
}

type Listener = () => void

const listeners = new Set<Listener>()

function deck(): Deck {
  return {
    mediaId: null,
    playing: false,
    position: 0,
    rate: 1,
    volume: 0.86,
    eq: { low: 0, mid: 0, high: 0 },
    filter: 0,
    cue: 0,
    loop: true,
  }
}

function defaultTracks(): Track[] {
  return [
    track('Drums', 'audio', '#e07a5f'),
    track('Bass', 'audio', '#d4a657'),
    track('Keys', 'audio', '#8b7cff'),
    track('Visual A', 'video', '#3ee0c5'),
    track('Overlay', 'video', '#f0d29a'),
  ]
}

function track(name: string, kind: Track['kind'], color: string): Track {
  return {
    id: uid('tr'),
    name,
    kind,
    volume: 0.85,
    pan: 0,
    muted: false,
    solo: false,
    eq: { low: 0, mid: 0, high: 0 },
    filter: 0,
    delay: 0,
    color,
  }
}

let state: StudioState = {
  project: { name: 'Untitled Mix', bpm: 120, duration: 32 },
  tracks: defaultTracks(),
  clips: [],
  assets: VISUALS.map((visual) => ({
    id: uid('vis'),
    name: visual.name,
    kind: 'visual',
    duration: 16,
    color: visual.color,
    visual: visual.id,
    hasAudio: false,
  })),
  mode: 'studio',
  tool: 'pointer',
  selectedClipId: null,
  selectedTrackId: null,
  selectedMediaId: null,
  pixelsPerSecond: 56,
  scrollX: 0,
  snap: true,
  loop: false,
  loopStart: 0,
  loopEnd: 16,
  playing: false,
  time: 0,
  recording: false,
  master: { volume: 0.9, filter: 0, reverb: 0.12, delay: 0.05, drive: 0 },
  deckA: deck(),
  deckB: deck(),
  xfader: 0.5,
  toasts: [],
  busy: null,
}

function emit(): void {
  for (const listener of listeners) listener()
}

function set(partial: Partial<StudioState> | ((current: StudioState) => StudioState)): void {
  state = typeof partial === 'function' ? partial(state) : { ...state, ...partial }
  emit()
}

export function getState(): StudioState {
  return state
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useStudio<T>(selector: (s: StudioState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  )
}

function toast(title: string, body?: string): void {
  const item: Toast = { id: uid('toast'), title, body }
  set((s) => ({ ...s, toasts: [...s.toasts, item] }))
  window.setTimeout(() => {
    set((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== item.id) }))
  }, 3200)
}

export const actions = {
  bindEngine() {
    engine.bind({
      getTracks: () => state.tracks,
      getClips: () => state.clips,
      getAssets: () => state.assets,
      getDecks: () => ({ a: state.deckA, b: state.deckB, xf: state.xfader }),
    })
    engine.onTime = (time) => {
      if (Math.abs(time - state.time) > 0.03) {
        const deckA = { ...state.deckA, position: engine.deckPosition('a', state.deckA) }
        const deckB = { ...state.deckB, position: engine.deckPosition('b', state.deckB) }
        set({ time, deckA, deckB, playing: engine.isPlaying(), recording: engine.recording })
      }
    }
    engine.onRecorded = (blob, mime) => {
      const ext = mime.includes('webm') ? 'webm' : 'mp4'
      download(blob, `${state.project.name.replace(/\s+/g, '-').toLowerCase()}.${ext}`)
      toast('Mix exported', 'Your recording is downloading.')
      set({ recording: false })
    }
    engine.setMasterVolume(state.master.volume)
    engine.setMasterFx(state.master.filter, state.master.reverb, state.master.delay, state.master.drive)
  },

  rename(name: string) {
    set({ project: { ...state.project, name } })
  },

  setBpm(bpm: number) {
    set({ project: { ...state.project, bpm: clamp(bpm, 60, 200) } })
  },

  setMode(mode: StudioMode) {
    engine.setMode(mode)
    set({ mode })
  },

  setTool(tool: Tool) {
    set({ tool })
  },

  toggleSnap() {
    set({ snap: !state.snap })
  },

  toggleLoop() {
    set({ loop: !state.loop })
  },

  setLoop(loopStart: number, loopEnd: number) {
    set({ loopStart, loopEnd: Math.max(loopStart + 0.25, loopEnd) })
  },

  setZoom(pps: number) {
    set({ pixelsPerSecond: clampZoom(pps) })
  },

  setScroll(scrollX: number) {
    set({ scrollX: Math.max(0, scrollX) })
  },

  selectClip(id: string | null) {
    const clip = state.clips.find((c) => c.id === id)
    set({ selectedClipId: id, selectedTrackId: clip?.trackId ?? state.selectedTrackId })
  },

  selectTrack(id: string | null) {
    set({ selectedTrackId: id })
  },

  selectMedia(id: string | null) {
    set({ selectedMediaId: id })
  },

  async play() {
    await engine.ensure()
    engine.setMode(state.mode)
    engine.play(state.project.duration, state.loop, state.loopStart, state.loopEnd)
    set({ playing: true })
  },

  pause() {
    engine.pause()
    set({ playing: false, time: engine.getTime() })
  },

  stop() {
    engine.stop()
    set({ playing: false, time: 0 })
  },

  async togglePlay() {
    if (state.playing) actions.pause()
    else await actions.play()
  },

  seek(time: number) {
    const t = Math.max(0, time)
    engine.seek(t)
    set({ time: t })
  },

  updateMaster<K extends keyof StudioState['master']>(key: K, value: number) {
    const master = { ...state.master, [key]: value }
    set({ master })
    engine.setMasterVolume(master.volume)
    engine.setMasterFx(master.filter, master.reverb, master.delay, master.drive)
  },

  updateTrack(id: string, patch: Partial<Track>) {
    set({
      tracks: state.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })
    if (state.playing && state.mode === 'studio') {
      engine.play(state.project.duration, state.loop, state.loopStart, state.loopEnd)
    }
  },

  addTrack(kind: Track['kind']) {
    const color = kind === 'audio' ? '#81b29a' : '#6ec3f0'
    const next = track(kind === 'audio' ? 'Audio' : 'Visual', kind, color)
    set({ tracks: [...state.tracks, next], selectedTrackId: next.id })
  },

  removeTrack(id: string) {
    if (state.tracks.length <= 1) return
    set({
      tracks: state.tracks.filter((t) => t.id !== id),
      clips: state.clips.filter((c) => c.trackId !== id),
    })
  },

  updateClip(id: string, patch: Partial<Clip>) {
    set({
      clips: state.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })
    set({ project: { ...state.project, duration: projectLength(state.clips, state.project.duration) } })
  },

  moveClip(id: string, start: number, trackId?: string) {
    const snapped = snapTime(start, state.project.bpm, 4, state.snap)
    set({
      clips: state.clips.map((c) =>
        c.id === id ? { ...c, start: snapped, trackId: trackId ?? c.trackId } : c,
      ),
    })
  },

  trim(id: string, edge: 'start' | 'end', time: number) {
    const clip = state.clips.find((c) => c.id === id)
    if (!clip) return
    const asset = state.assets.find((a) => a.id === clip.mediaId)
    const max = asset?.duration ?? clip.duration + clip.offset
    const next = trimClip(clip, edge, snapTime(time, state.project.bpm, 4, state.snap), max)
    actions.updateClip(id, next)
  },

  splitAtPlayhead() {
    const time = state.time
    const next: Clip[] = []
    for (const clip of state.clips) {
      const parts = splitClip(clip, time, uid('clip'))
      if (parts) next.push(...parts)
      else next.push(clip)
    }
    set({ clips: next })
  },

  splitClipAt(id: string, time: number) {
    const clip = state.clips.find((c) => c.id === id)
    if (!clip) return
    const parts = splitClip(clip, time, uid('clip'))
    if (!parts) return
    set({ clips: state.clips.flatMap((c) => (c.id === id ? parts : [c])) })
  },

  deleteSelected() {
    if (state.selectedClipId) {
      set({ clips: state.clips.filter((c) => c.id !== state.selectedClipId), selectedClipId: null })
    }
  },

  duplicateSelected() {
    const clip = state.clips.find((c) => c.id === state.selectedClipId)
    if (!clip) return
    const copy: Clip = { ...clip, id: uid('clip'), start: clipEnd(clip) }
    set({ clips: [...state.clips, copy], selectedClipId: copy.id })
  },

  addClip(mediaId: string, trackId: string, start: number) {
    const media = state.assets.find((a) => a.id === mediaId)
    const track = state.tracks.find((t) => t.id === trackId)
    if (!media || !track) return
    const clip: Clip = {
      id: uid('clip'),
      trackId,
      mediaId,
      start: snapTime(start, state.project.bpm, 4, state.snap),
      duration: media.duration,
      offset: 0,
      gain: 1,
      fadeIn: 0.01,
      fadeOut: 0.04,
      playbackRate: 1,
      opacity: 1,
      blend: 'source-over',
      scale: 1,
      x: 0,
      y: 0,
      hue: 32,
      text: state.project.name,
    }
    const clips = [...state.clips, clip]
    set({
      clips,
      selectedClipId: clip.id,
      selectedTrackId: trackId,
      project: { ...state.project, duration: projectLength(clips) },
    })
  },

  dropMediaOnTimeline(mediaId: string, trackId: string | null, start: number) {
    const media = state.assets.find((a) => a.id === mediaId)
    if (!media) return
    const kind: Track['kind'] = media.kind === 'audio' ? 'audio' : 'video'
    const track =
      state.tracks.find((t) => t.id === trackId && t.kind === kind) ??
      state.tracks.find((t) => t.kind === kind)
    if (!track) return
    actions.addClip(mediaId, track.id, start)
  },

  loadToDeck(which: 'a' | 'b', mediaId: string) {
    const key = which === 'a' ? 'deckA' : 'deckB'
    set({ [key]: { ...state[key], mediaId, position: 0, cue: 0 } } as Partial<StudioState>)
    engine.applyDeck(which, { ...state[key], mediaId }, state.xfader)
  },

  updateDeck(which: 'a' | 'b', patch: Partial<Deck>) {
    const key = which === 'a' ? 'deckA' : 'deckB'
    const next = { ...state[key], ...patch }
    set({ [key]: next } as Partial<StudioState>)
    engine.applyDeck(which, next, state.xfader)
  },

  setXfader(value: number) {
    set({ xfader: clamp(value, 0, 1) })
    engine.applyDeck('a', state.deckA, value)
    engine.applyDeck('b', state.deckB, value)
  },

  async toggleDeck(which: 'a' | 'b') {
    await engine.ensure()
    const key = which === 'a' ? 'deckA' : 'deckB'
    const deckState = state[key]
    if (!deckState.mediaId) {
      toast('Load a track first', 'Drop audio onto the deck.')
      return
    }
    if (deckState.playing) {
      engine.stopDeck(which)
      actions.updateDeck(which, { playing: false, position: engine.deckPosition(which, deckState) })
    } else {
      await engine.playDeck(which, deckState)
      actions.updateDeck(which, { playing: true })
    }
  },

  cueDeck(which: 'a' | 'b') {
    const key = which === 'a' ? 'deckA' : 'deckB'
    const deckState = { ...state[key], position: state[key].cue, playing: false }
    engine.stopDeck(which)
    set({ [key]: deckState } as Partial<StudioState>)
  },

  setCue(which: 'a' | 'b') {
    const key = which === 'a' ? 'deckA' : 'deckB'
    set({ [key]: { ...state[key], cue: state[key].position } } as Partial<StudioState>)
  },

  async importFiles(files: FileList | File[]) {
    await engine.ensure()
    const list = [...files]
    for (const file of list) {
      const kind = isAudioFile(file) ? 'audio' : isVideoFile(file) ? 'video' : isImageFile(file) ? 'image' : null
      if (!kind) continue
      const id = uid('media')
      set({ busy: `Importing ${file.name}` })
      try {
        const duration = await engine.putFile(id, file, kind)
        const loaded = engine.media.get(id)
        const peaks = loaded?.buffer ? peaksFromBuffer(loaded.buffer) : computePeaks(new Float32Array(8))
        const asset: MediaAsset = {
          id,
          name: file.name.replace(/\.[^.]+$/, ''),
          kind,
          duration,
          color: kind === 'audio' ? '#d4a657' : kind === 'video' ? '#3ee0c5' : '#f0d29a',
          url: URL.createObjectURL(file),
          mime: file.type,
          peaks,
          hasAudio: Boolean(loaded?.buffer),
        }
        set({ assets: [...state.assets, asset], selectedMediaId: id, busy: null })
        const track = state.tracks.find((t) => t.kind === (kind === 'audio' ? 'audio' : 'video'))
        if (track) actions.addClip(id, track.id, lastEnd(track.id))
        toast('Imported', file.name)
      } catch {
        set({ busy: null })
        toast('Could not import', file.name)
      }
    }
  },

  async loadDemo() {
    set({ busy: 'Composing demo session' })
    await engine.ensure()
    const sr = engine.ctx?.sampleRate ?? 44100
    const stems = buildDemoStems(sr)
    const tracks = defaultTracks()
    const assets: MediaAsset[] = [...state.assets.filter((a) => a.kind === 'visual')]
    const clips: Clip[] = []
    for (const [index, stem] of stems.entries()) {
      if (index > 2) continue
      const buffer = samplesToBuffer(stem.samples, sr)
      const id = uid('media')
      await engine.putBuffer(id, buffer)
      const asset: MediaAsset = {
        id,
        name: stem.name,
        kind: 'audio',
        duration: stem.duration,
        color: stem.color,
        peaks: peaksFromBuffer(buffer),
        bpm: stem.bpm,
        hasAudio: true,
      }
      assets.push(asset)
      const tr = tracks[index]
      if (!tr) continue
      clips.push(makeClip(tr.id, id, 0, stem.duration, stem.color))
    }
    const deckStem = stems[3]
    if (deckStem) {
      const buffer = samplesToBuffer(deckStem.samples, sr)
      const id = uid('media')
      await engine.putBuffer(id, buffer)
      assets.push({
        id,
        name: deckStem.name,
        kind: 'audio',
        duration: deckStem.duration,
        color: deckStem.color,
        peaks: peaksFromBuffer(buffer),
        bpm: deckStem.bpm,
        hasAudio: true,
      })
      set({
        deckA: { ...state.deckA, mediaId: assets.find((a) => a.name === 'House Drums')?.id ?? null },
        deckB: { ...state.deckB, mediaId: id },
      })
    }
    const aurora = assets.find((a) => a.visual === 'aurora')
    const pulse = assets.find((a) => a.visual === 'pulse')
    const title = assets.find((a) => a.visual === 'title')
    const videoA = tracks[3]
    const overlay = tracks[4]
    if (aurora && videoA) clips.push({ ...makeClip(videoA.id, aurora.id, 0, 16, aurora.color), hue: 168 })
    if (pulse && videoA) clips.push({ ...makeClip(videoA.id, pulse.id, 16, 16, pulse.color), hue: 32 })
    if (title && overlay) {
      clips.push({
        ...makeClip(overlay.id, title.id, 0, 8, title.color),
        blend: 'screen',
        opacity: 0.92,
        text: 'SERIOUS EDITS',
      })
    }
    set({
      tracks,
      assets,
      clips,
      project: { name: 'Night Shift', bpm: 120, duration: 32 },
      busy: null,
      selectedClipId: clips[0]?.id ?? null,
    })
    toast('Demo session loaded', 'Hit play to hear the mix.')
    await actions.play()
  },

  newProject() {
    engine.stop()
    engine.stopDeck('a')
    engine.stopDeck('b')
    set({
      project: { name: 'Untitled Mix', bpm: 120, duration: 32 },
      tracks: defaultTracks(),
      clips: [],
      selectedClipId: null,
      playing: false,
      time: 0,
      deckA: deck(),
      deckB: deck(),
    })
  },

  async toggleRecord() {
    await engine.ensure()
    if (state.recording) {
      engine.stopRecording()
      set({ recording: false })
      return
    }
    if (!state.playing) await actions.play()
    await engine.startRecording()
    set({ recording: true })
    toast('Recording', 'Video + audio capture is live.')
  },

  async exportWav() {
    set({ busy: 'Bouncing audio mix' })
    try {
      const blob = await engine.bounceWav(state.project.duration)
      download(blob, `${slug(state.project.name)}.wav`)
      toast('Audio exported', 'WAV mixdown is downloading.')
    } catch {
      toast('Export failed', 'Try playing the project once, then export.')
    }
    set({ busy: null })
  },

  exportProject() {
    const payload = {
      project: state.project,
      tracks: state.tracks,
      clips: state.clips,
      assets: state.assets.map(({ peaks: _peaks, url: _url, ...rest }) => rest),
    }
    download(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${slug(state.project.name)}.json`)
    toast('Project saved', 'Timeline JSON downloaded.')
  },
}

function makeClip(trackId: string, mediaId: string, start: number, duration: number, _color: string): Clip {
  return {
    id: uid('clip'),
    trackId,
    mediaId,
    start,
    duration,
    offset: 0,
    gain: 1,
    fadeIn: 0.01,
    fadeOut: 0.08,
    playbackRate: 1,
    opacity: 1,
    blend: 'source-over',
    scale: 1,
    x: 0,
    y: 0,
    hue: 32,
    text: 'SERIOUS EDITS',
  }
}

function lastEnd(trackId: string): number {
  return state.clips.filter((c) => c.trackId === trackId).reduce((m, c) => Math.max(m, clipEnd(c)), 0)
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'serious-edits'
}

export function selectedClip(): Clip | undefined {
  return state.clips.find((c) => c.id === state.selectedClipId)
}

export function isSoloed(): boolean {
  return anySolo(state.tracks)
}
