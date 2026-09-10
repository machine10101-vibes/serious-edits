import { useSyncExternalStore } from 'react'
import { engine, peaksFromBuffer } from './engine/studioEngine'
import { uid } from './lib/id'
import { anySolo, clipEnd, createClip, projectLength, splitClip, trimClip } from './lib/clips'
import { buildDemoStems, samplesToBuffer } from './lib/demoAudio'
import { encodeMp3 } from './lib/encodeMp3'
import { autoCrossfadeTrack, scoreVisuals } from './lib/looks'
import { mediaKindFromFile } from './lib/mediaFiles'
import { clamp } from './lib/mix'
import { aspectExportSize, audioMixLength, extensionForMime, fitPictureClips } from './lib/picture'
import { clampZoom, secondsPerBeat, snapTime } from './lib/time'
import { computePeaks } from './lib/waveform'
import type {
  AspectRatio,
  Clip,
  Deck,
  LookId,
  Marker,
  MediaAsset,
  MobilePanel,
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
  markers: Marker[]
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
  panel: MobilePanel | null
  follow: boolean
  help: boolean
  exportOpen: boolean
  exporting: 'video' | 'audio' | null
}

type Listener = () => void

const listeners = new Set<Listener>()
let undoStack: string[] = []
let redoStack: string[] = []

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
    hotCues: [-1, -1, -1, -1],
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

function blankProject(): Project {
  return {
    name: 'Untitled Mix',
    bpm: 120,
    duration: 32,
    aspect: '16:9',
    look: 'clean',
    reactive: true,
    subtitle: '',
    metronome: false,
  }
}

let state: StudioState = {
  project: blankProject(),
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
  markers: [],
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
  panel: null,
  follow: true,
  help: false,
  exportOpen: false,
  exporting: null,
}

function emit(): void {
  for (const listener of listeners) listener()
}

function set(partial: Partial<StudioState> | ((current: StudioState) => StudioState)): void {
  state = typeof partial === 'function' ? partial(state) : { ...state, ...partial }
  emit()
}

function snapshot(): void {
  undoStack.push(
    JSON.stringify({
      tracks: state.tracks,
      clips: state.clips,
      project: state.project,
      markers: state.markers,
    }),
  )
  if (undoStack.length > 40) undoStack.shift()
  redoStack = []
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
      getPicture: () => ({
        look: state.project.look,
        reactive: state.project.reactive,
        subtitle: state.project.subtitle,
        metronome: state.project.metronome,
        bpm: state.project.bpm,
      }),
    })
    engine.onTime = (time) => {
      if (Math.abs(time - state.time) > 0.03 || state.exporting) {
        const deckA = { ...state.deckA, position: engine.deckPosition('a', state.deckA) }
        const deckB = { ...state.deckB, position: engine.deckPosition('b', state.deckB) }
        const busy =
          state.exporting === 'video'
            ? `Exporting video · ${Math.min(state.project.duration, time).toFixed(0)}s / ${state.project.duration.toFixed(0)}s`
            : state.busy
        set({ time, deckA, deckB, playing: engine.isPlaying(), recording: engine.recording, busy })
      }
    }
    engine.onRecorded = (blob, mime) => {
      const ext = extensionForMime(mime)
      download(blob, `${slug(state.project.name)}.${ext}`)
      toast('Mix exported', ext === 'mp4' ? 'MP4 is downloading.' : 'Video file is downloading.')
      set({ recording: false })
    }
    engine.setMasterVolume(state.master.volume)
    engine.setMasterFx(state.master.filter, state.master.reverb, state.master.delay, state.master.drive)
  },

  setPanel(panel: MobilePanel | null) {
    set({ panel })
  },

  togglePanel(panel: MobilePanel) {
    set({ panel: state.panel === panel ? null : panel })
  },

  toggleHelp() {
    set({ help: !state.help })
  },

  toggleExport() {
    set({ exportOpen: !state.exportOpen, panel: null })
  },

  toggleFollow() {
    set({ follow: !state.follow })
  },

  rename(name: string) {
    set({ project: { ...state.project, name } })
  },

  setBpm(bpm: number) {
    set({ project: { ...state.project, bpm: clamp(bpm, 60, 200) } })
  },

  tapTempo() {
    const now = performance.now()
    taps.push(now)
    taps = taps.filter((t) => now - t < 3000).slice(-6)
    if (taps.length < 2) return
    const gaps = taps.slice(1).map((t, i) => t - (taps[i] ?? 0))
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length
    actions.setBpm(clamp(Math.round(60000 / avg), 60, 200))
  },

  setAspect(aspect: AspectRatio) {
    set({ project: { ...state.project, aspect } })
  },

  setLook(look: LookId) {
    set({ project: { ...state.project, look } })
  },

  setSubtitle(subtitle: string) {
    set({ project: { ...state.project, subtitle } })
  },

  toggleReactive() {
    set({ project: { ...state.project, reactive: !state.project.reactive } })
  },

  toggleMetronome() {
    snapshot()
    set({ project: { ...state.project, metronome: !state.project.metronome } })
    if (state.playing && state.mode === 'studio') {
      engine.play(state.project.duration, state.loop, state.loopStart, state.loopEnd)
    }
  },

  setMode(mode: StudioMode) {
    engine.setMode(mode)
    set({ mode, panel: null })
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

  loopIn() {
    set({ loopStart: state.time, loop: true, loopEnd: Math.max(state.time + 1, state.loopEnd) })
  },

  loopOut() {
    set({ loopEnd: Math.max(state.loopStart + 0.25, state.time), loop: true })
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

  skip(beats: number) {
    actions.seek(Math.max(0, state.time + beats * secondsPerBeat(state.project.bpm)))
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
    engine.updateLiveTracks()
  },

  addTrack(kind: Track['kind']) {
    snapshot()
    const color = kind === 'audio' ? '#81b29a' : '#6ec3f0'
    const next = track(kind === 'audio' ? 'Audio' : 'Visual', kind, color)
    set({ tracks: [...state.tracks, next], selectedTrackId: next.id })
  },

  removeTrack(id: string) {
    if (state.tracks.length <= 1) return
    snapshot()
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
    if (
      state.playing &&
      state.mode === 'studio' &&
      ('audioEnabled' in patch || 'loop' in patch || 'playbackRate' in patch || 'gain' in patch)
    ) {
      engine.play(state.project.duration, state.loop, state.loopStart, state.loopEnd)
    }
  },

  moveClip(id: string, start: number, trackId?: string) {
    const snapped = snapTime(start, state.project.bpm, 4, state.snap)
    set({
      clips: state.clips.map((c) =>
        c.id === id ? { ...c, start: snapped, trackId: trackId ?? c.trackId } : c,
      ),
    })
  },

  nudgeSelected(beats: number) {
    const clip = state.clips.find((c) => c.id === state.selectedClipId)
    if (!clip) return
    snapshot()
    actions.moveClip(clip.id, clip.start + beats * secondsPerBeat(state.project.bpm))
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
    snapshot()
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
    snapshot()
    set({ clips: state.clips.flatMap((c) => (c.id === id ? parts : [c])) })
  },

  deleteSelected() {
    if (state.selectedClipId) {
      snapshot()
      set({ clips: state.clips.filter((c) => c.id !== state.selectedClipId), selectedClipId: null })
    }
  },

  duplicateSelected() {
    const clip = state.clips.find((c) => c.id === state.selectedClipId)
    if (!clip) return
    snapshot()
    const copy: Clip = { ...clip, id: uid('clip'), start: clipEnd(clip) }
    set({ clips: [...state.clips, copy], selectedClipId: copy.id })
  },

  addClip(mediaId: string, trackId: string, start: number) {
    const media = state.assets.find((a) => a.id === mediaId)
    const trackItem = state.tracks.find((t) => t.id === trackId)
    if (!media || !trackItem) return
    snapshot()
    const clip: Clip = {
      id: uid('clip'),
      trackId,
      mediaId,
      start: snapTime(start, state.project.bpm, 4, state.snap),
      duration: media.duration,
      offset: 0,
      gain: 1,
      fadeIn: media.kind === 'audio' ? 0.04 : 0.12,
      fadeOut: media.kind === 'audio' ? 0.08 : 0.18,
      playbackRate: 1,
      opacity: 1,
      blend: 'source-over',
      scale: 1,
      x: 0,
      y: 0,
      hue: 32,
      text: state.project.name,
      audioEnabled: media.kind === 'audio',
      fit: 'cover',
      loop: false,
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
    const trackItem =
      state.tracks.find((t) => t.id === trackId && t.kind === kind) ??
      state.tracks.find((t) => t.kind === kind)
    if (!trackItem) return
    actions.addClip(mediaId, trackItem.id, start)
  },

  addAtPlayhead(mediaId?: string) {
    const id = mediaId ?? state.selectedMediaId
    if (!id) {
      toast('Pick a clip first', 'Select something in the library.')
      return
    }
    actions.dropMediaOnTimeline(id, state.selectedTrackId, state.time)
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

  setHotCue(which: 'a' | 'b', index: number) {
    const key = which === 'a' ? 'deckA' : 'deckB'
    const hotCues = [...state[key].hotCues]
    hotCues[index] = state[key].position
    set({ [key]: { ...state[key], hotCues } } as Partial<StudioState>)
  },

  jumpHotCue(which: 'a' | 'b', index: number) {
    const key = which === 'a' ? 'deckA' : 'deckB'
    const cue = state[key].hotCues[index]
    if (cue == null || cue < 0) {
      actions.setHotCue(which, index)
      return
    }
    const next = { ...state[key], position: cue }
    set({ [key]: next } as Partial<StudioState>)
    if (next.playing) void engine.playDeck(which, next)
  },

  jumpBeats(which: 'a' | 'b', beats: number) {
    const key = which === 'a' ? 'deckA' : 'deckB'
    const asset = state.assets.find((a) => a.id === state[key].mediaId)
    const duration = asset?.duration ?? 0
    const position = clamp(state[key].position + beats * secondsPerBeat(state.project.bpm), 0, Math.max(0.01, duration))
    const next = { ...state[key], position }
    set({ [key]: next } as Partial<StudioState>)
    if (next.playing) void engine.playDeck(which, next)
  },

  syncDeck(which: 'a' | 'b') {
    const key = which === 'a' ? 'deckA' : 'deckB'
    const asset = state.assets.find((a) => a.id === state[key].mediaId)
    const assumed = asset?.bpm ?? state.project.bpm
    const rate = clamp(state.project.bpm / assumed, 0.92, 1.08)
    actions.updateDeck(which, { rate })
    toast('Deck synced', `${which.toUpperCase()} locked to ${state.project.bpm} BPM`)
  },

  dropMarker() {
    snapshot()
    const marker: Marker = {
      id: uid('mk'),
      time: snapTime(state.time, state.project.bpm, 4, state.snap),
      label: `Cue ${state.markers.length + 1}`,
    }
    set({ markers: [...state.markers, marker] })
  },

  seekMarker(id: string) {
    const marker = state.markers.find((m) => m.id === id)
    if (marker) actions.seek(marker.time)
  },

  removeMarker(id: string) {
    snapshot()
    set({ markers: state.markers.filter((m) => m.id !== id) })
  },

  scorePicture() {
    const video = state.tracks.find((t) => t.kind === 'video')
    if (!video) return
    snapshot()
    const scored = scoreVisuals(
      state.assets,
      state.project.duration,
      state.project.bpm,
    )
    const kept = state.clips.filter((c) => c.trackId !== video.id)
    const added = scored.map((item) => ({
      ...makeClip(video.id, item.mediaId, item.start, item.duration),
      fadeIn: 0.2,
      fadeOut: 0.25,
    }))
    const clips = [...kept, ...added]
    set({
      clips,
      project: { ...state.project, duration: projectLength(clips) },
      selectedClipId: added[0]?.id ?? state.selectedClipId,
    })
    toast('Picture scored', 'Visuals now follow the beat grid.')
  },

  fitPictureToMix() {
    const videoIds = state.tracks.filter((track) => track.kind === 'video').map((track) => track.id)
    if (!videoIds.length || !state.clips.some((clip) => videoIds.includes(clip.trackId))) {
      toast('Add a video first', 'Import a clip, then Fit picture to cover the song.')
      return
    }
    snapshot()
    const mix = audioMixLength(
      state.clips,
      state.tracks.filter((track) => track.kind === 'audio').map((track) => track.id),
      state.project.duration,
    )
    const clips = fitPictureClips(state.clips, videoIds, mix)
    set({
      clips,
      project: { ...state.project, duration: projectLength(clips) },
    })
    toast('Picture fitted', 'Video now loops for the length of the mix.')
  },

  setPictureAudio(enabled: boolean) {
    snapshot()
    const videoIds = new Set(state.tracks.filter((track) => track.kind === 'video').map((track) => track.id))
    set({
      clips: state.clips.map((clip) => (videoIds.has(clip.trackId) ? { ...clip, audioEnabled: enabled } : clip)),
    })
    toast(enabled ? 'Picture audio on' : 'Picture audio muted', enabled ? 'Original video sound is in the mix.' : 'Your music sits under the picture.')
    if (state.playing && state.mode === 'studio') {
      engine.play(state.project.duration, state.loop, state.loopStart, state.loopEnd)
    }
  },

  autoFade() {
    snapshot()
    const groups = new Map<string, Clip[]>()
    for (const clip of state.clips) {
      const list = groups.get(clip.trackId) ?? []
      list.push(clip)
      groups.set(clip.trackId, list)
    }
    const next: Clip[] = []
    for (const [trackId, group] of groups) {
      const trackItem = state.tracks.find((t) => t.id === trackId)
      next.push(...(trackItem?.kind === 'audio' ? autoCrossfadeTrack(group, 0.35) : group))
    }
    set({ clips: next })
    toast('Auto-fade', 'Audio clips now overlap with fades.')
  },

  undo() {
    const prev = undoStack.pop()
    if (!prev) return
    redoStack.push(
      JSON.stringify({
        tracks: state.tracks,
        clips: state.clips,
        project: state.project,
        markers: state.markers,
      }),
    )
    const parsed = JSON.parse(prev) as Pick<StudioState, 'tracks' | 'clips' | 'project' | 'markers'>
    set(parsed)
  },

  redo() {
    const next = redoStack.pop()
    if (!next) return
    undoStack.push(
      JSON.stringify({
        tracks: state.tracks,
        clips: state.clips,
        project: state.project,
        markers: state.markers,
      }),
    )
    const parsed = JSON.parse(next) as Pick<StudioState, 'tracks' | 'clips' | 'project' | 'markers'>
    set(parsed)
  },

  async importFiles(files: FileList | File[]) {
    const list = [...files]
    const usable = list.filter((file) => mediaKindFromFile(file))
    if (!usable.length) {
      toast('Need a video or a song', 'Use MP4, MOV, MP3, WAV, or similar.')
      return
    }
    await engine.ensure()
    let imported = 0
    for (const file of usable) {
      const kind = mediaKindFromFile(file)
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
        const trackItem = state.tracks.find((t) => t.kind === (kind === 'audio' ? 'audio' : 'video'))
        if (trackItem) actions.addClip(id, trackItem.id, lastEnd(trackItem.id))
        imported += 1
        const audioIds = state.tracks.filter((track) => track.kind === 'audio').map((track) => track.id)
        const videoIds = state.tracks.filter((track) => track.kind === 'video').map((track) => track.id)
        const mix = audioMixLength(state.clips, audioIds, 0)
        if (mix > 0.2 && state.clips.some((clip) => videoIds.includes(clip.trackId))) {
          const clips = fitPictureClips(state.clips, videoIds, mix)
          set({ clips, project: { ...state.project, duration: projectLength(clips) } })
        }
        if (kind === 'audio') toast('Song on the mix', 'Export MP3 for audio or MP4 for the finished video.')
        else if (kind === 'video') toast('Video on the picture track', 'Import a song, then Export MP4 or MP3.')
        else toast('Imported', file.name)
      } catch {
        set({ busy: null })
        toast('Could not import', file.name)
      }
    }
    if (!imported) set({ busy: null })
  },

  async loadDemo() {
    set({ busy: 'Composing demo session' })
    await engine.ensure()
    snapshot()
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
      clips.push(makeClip(tr.id, id, 0, stem.duration))
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
    if (aurora && videoA) clips.push({ ...makeClip(videoA.id, aurora.id, 0, 16), hue: 168, fadeIn: 0.2, fadeOut: 0.3 })
    if (pulse && videoA) clips.push({ ...makeClip(videoA.id, pulse.id, 16, 16), hue: 32, fadeIn: 0.2, fadeOut: 0.3 })
    if (title && overlay) {
      clips.push({
        ...makeClip(overlay.id, title.id, 0, 8),
        blend: 'screen',
        opacity: 0.92,
        text: 'SERIOUS EDITS',
      })
    }
    set({
      tracks,
      assets,
      clips,
      markers: [{ id: uid('mk'), time: 0, label: 'Intro' }, { id: uid('mk'), time: 8, label: 'Drop' }],
      project: {
        name: 'Night Shift',
        bpm: 120,
        duration: 32,
        aspect: '16:9',
        look: 'clean',
        reactive: true,
        subtitle: 'Night Shift — Serious Edits',
        metronome: false,
      },
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
    snapshot()
    set({
      project: blankProject(),
      tracks: defaultTracks(),
      clips: [],
      markers: [],
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
      void engine.stopRecording()
      set({ recording: false })
      return
    }
    if (!state.playing) await actions.play()
    await engine.startRecording()
    set({ recording: true })
    toast('Recording', `Capturing ${state.project.aspect} program output.`)
  },

  async exportWav() {
    set({ busy: 'Bouncing audio mix', exporting: 'audio', exportOpen: false })
    try {
      const blob = await engine.bounceWav(mixDuration())
      download(blob, `${slug(state.project.name)}.wav`)
      toast('Audio exported', 'WAV mixdown is downloading.')
    } catch {
      toast('Export failed', 'Try playing the project once, then export.')
    }
    set({ busy: null, exporting: null })
  },

  async exportMp3() {
    set({ busy: 'Encoding MP3 mix', exporting: 'audio', exportOpen: false })
    try {
      const buffer = await engine.bounceMix(mixDuration())
      const blob = encodeMp3(buffer, 192)
      download(blob, `${slug(state.project.name)}.mp3`)
      toast('Audio exported', 'MP3 mixdown is downloading.')
    } catch {
      toast('MP3 export failed', 'Try WAV instead, or play the mix once first.')
    }
    set({ busy: null, exporting: null })
  },

  async exportVideo() {
    if (state.exporting) return
    if (state.mode !== 'studio') {
      engine.setMode('studio')
      set({ mode: 'studio', panel: null })
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    }
    await engine.ensure()
    const from = state.loop ? state.loopStart : 0
    const end = state.loop ? state.loopEnd : mixDuration()
    const duration = Math.max(0.5, end - from)
    const size = aspectExportSize(state.project.aspect)
    const metronome = state.project.metronome
    set({
      exporting: 'video',
      busy: `Exporting video · 0s / ${duration.toFixed(0)}s`,
      exportOpen: false,
      project: { ...state.project, metronome: false },
      playing: true,
      recording: true,
    })
    try {
      const { blob, mime } = await engine.bounceProgram(duration, size, from)
      const ext = extensionForMime(mime)
      download(blob, `${slug(state.project.name)}.${ext}`)
      toast(
        ext === 'mp4' ? 'MP4 exported' : 'Video exported',
        ext === 'mp4'
          ? 'Your mix video is downloading.'
          : 'This browser encoded WebM. Chrome or Safari can export MP4.',
      )
    } catch {
      toast('Video export failed', 'Play the mix once, then try Export again.')
    }
    set({
      busy: null,
      exporting: null,
      recording: false,
      playing: false,
      time: 0,
      project: { ...state.project, metronome },
    })
  },

  openImporter(kind: 'audio' | 'video' | 'any') {
    const id = kind === 'audio' ? 'se-import-audio' : kind === 'video' ? 'se-import-video' : 'se-import-any'
    document.getElementById(id)?.click()
  },

  exportProject() {
    const payload = {
      project: state.project,
      tracks: state.tracks,
      clips: state.clips,
      markers: state.markers,
      assets: state.assets.map(({ peaks: _peaks, url: _url, ...rest }) => rest),
    }
    download(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${slug(state.project.name)}.json`)
    toast('Project saved', 'Timeline JSON downloaded.')
  },
}

let taps: number[] = []

function makeClip(trackId: string, mediaId: string, start: number, duration: number, extra: Partial<Clip> = {}): Clip {
  return createClip({
    id: uid('clip'),
    trackId,
    mediaId,
    start,
    duration,
    fadeIn: 0.01,
    fadeOut: 0.08,
    text: 'SERIOUS EDITS',
    ...extra,
  })
}

function lastEnd(trackId: string): number {
  return state.clips.filter((c) => c.trackId === trackId).reduce((m, c) => Math.max(m, clipEnd(c)), 0)
}

function mixDuration(): number {
  const end = state.clips.reduce((max, clip) => Math.max(max, clipEnd(clip)), 0)
  return Math.max(0.5, end + 0.05)
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
