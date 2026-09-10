import type { Clip, Deck, LookId, MediaAsset, Track } from '../types'
import { anySolo, clipAtTime, clipEnd, trackAudible } from '../lib/clips'
import { applyLook, drawLowerThird } from '../lib/looks'
import { clamp, equalPower, fadeGain, filterFromKnob } from '../lib/mix'
import { drawVisual } from '../lib/visuals'
import { encodeWav } from '../lib/waveform'

export interface LoadedMedia {
  id: string
  buffer?: AudioBuffer
  video?: HTMLVideoElement
  image?: HTMLImageElement
}

interface ActiveSource {
  source: AudioBufferSourceNode
  gain: GainNode
}

interface DeckGraph {
  source: AudioBufferSourceNode | null
  gain: GainNode
  low: BiquadFilterNode
  mid: BiquadFilterNode
  high: BiquadFilterNode
  filter: BiquadFilterNode
  startedAt: number
  origin: number
  video?: HTMLVideoElement
}

interface TrackChain {
  input: GainNode
  vol: GainNode
  pan: StereoPannerNode
  low: BiquadFilterNode
  mid: BiquadFilterNode
  high: BiquadFilterNode
  filter: BiquadFilterNode
  wet: GainNode
}

interface PictureState {
  look: LookId
  reactive: boolean
  subtitle: string
  metronome: boolean
  bpm: number
}

export interface EngineSnapshot {
  playing: boolean
  time: number
  recording: boolean
}

const FFT = 1024

class StudioEngine {
  ctx: AudioContext | null = null
  master: GainNode | null = null
  analyser: AnalyserNode | null = null
  compressor: DynamicsCompressorNode | null = null
  reverb: ConvolverNode | null = null
  reverbGain: GainNode | null = null
  delay: DelayNode | null = null
  delayGain: GainNode | null = null
  delayFeedback: GainNode | null = null
  recordDest: MediaStreamAudioDestinationNode | null = null
  drive: WaveShaperNode | null = null
  masterFilter: BiquadFilterNode | null = null
  media = new Map<string, LoadedMedia>()
  private sources: ActiveSource[] = []
  private canvas: HTMLCanvasElement | null = null
  private playing = false
  private pausedAt = 0
  private startedAt = 0
  private raf = 0
  private projectTimeLength = 32
  private loop = false
  private loopStart = 0
  private loopEnd = 16
  private getTracks: () => Track[] = () => []
  private getClips: () => Clip[] = () => []
  private getAssets: () => MediaAsset[] = () => []
  private getDecks: () => { a: Deck; b: Deck; xf: number } = () => ({
    a: emptyDeck(),
    b: emptyDeck(),
    xf: 0.5,
  })
  private getPicture: () => PictureState = () => ({
    look: 'clean',
    reactive: true,
    subtitle: '',
    metronome: false,
    bpm: 120,
  })
  private chains = new Map<string, TrackChain>()
  private click: AudioBuffer | null = null
  private mode: 'studio' | 'dj' = 'studio'
  deckA: DeckGraph | null = null
  deckB: DeckGraph | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  recording = false
  private freq = new Uint8Array(FFT / 2)
  private timeDomain = new Uint8Array(FFT)
  onTime?: (time: number) => void
  onRecorded?: (blob: Blob, mime: string) => void

  async ensure(): Promise<AudioContext> {
    if (!this.ctx) {
      const ctx = new AudioContext()
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.gain.value = 0.9
      this.compressor = ctx.createDynamicsCompressor()
      this.compressor.threshold.value = -14
      this.compressor.ratio.value = 6
      this.analyser = ctx.createAnalyser()
      this.analyser.fftSize = FFT
      this.recordDest = ctx.createMediaStreamDestination()
      this.masterFilter = ctx.createBiquadFilter()
      this.masterFilter.type = 'allpass'
      this.masterFilter.frequency.value = 12000
      this.drive = ctx.createWaveShaper()
      this.drive.curve = makeDriveCurve(0) as Float32Array<ArrayBuffer>
      this.reverb = ctx.createConvolver()
      this.reverb.buffer = makeImpulse(ctx, 1.8, 2.4)
      this.reverbGain = ctx.createGain()
      this.reverbGain.gain.value = 0
      this.delay = ctx.createDelay(1.5)
      this.delay.delayTime.value = 0.28
      this.delayGain = ctx.createGain()
      this.delayGain.gain.value = 0
      this.delayFeedback = ctx.createGain()
      this.delayFeedback.gain.value = 0.28
      this.master.connect(this.drive)
      this.drive.connect(this.masterFilter)
      this.masterFilter.connect(this.compressor)
      this.compressor.connect(this.analyser)
      this.analyser.connect(ctx.destination)
      this.analyser.connect(this.recordDest)
      this.master.connect(this.reverb)
      this.reverb.connect(this.reverbGain)
      this.reverbGain.connect(this.compressor)
      this.master.connect(this.delay)
      this.delay.connect(this.delayFeedback)
      this.delayFeedback.connect(this.delay)
      this.delay.connect(this.delayGain)
      this.delayGain.connect(this.compressor)
      this.deckA = this.makeDeckGraph()
      this.deckB = this.makeDeckGraph()
      this.click = makeClick(ctx)
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume()
    this.startLoop()
    return this.ctx
  }

  bind(opts: {
    getTracks: () => Track[]
    getClips: () => Clip[]
    getAssets: () => MediaAsset[]
    getDecks: () => { a: Deck; b: Deck; xf: number }
    getPicture: () => PictureState
  }): void {
    this.getTracks = opts.getTracks
    this.getClips = opts.getClips
    this.getAssets = opts.getAssets
    this.getDecks = opts.getDecks
    this.getPicture = opts.getPicture
  }

  setMode(mode: 'studio' | 'dj'): void {
    this.mode = mode
  }

  attachCanvas(canvas: HTMLCanvasElement | null): void {
    this.canvas = canvas
  }

  async putBuffer(id: string, buffer: AudioBuffer): Promise<void> {
    const current = this.media.get(id) ?? { id }
    current.buffer = buffer
    this.media.set(id, current)
  }

  async putFile(id: string, file: File | Blob, kind: 'audio' | 'video' | 'image'): Promise<number> {
    await this.ensure()
    const url = URL.createObjectURL(file)
    const current = this.media.get(id) ?? { id }
    if (kind === 'image') {
      const image = await loadImage(url)
      current.image = image
      this.media.set(id, current)
      return 8
    }
    if (kind === 'video') {
      const video = await loadVideo(url)
      current.video = video
      this.media.set(id, current)
      try {
        const copy = await file.arrayBuffer()
        current.buffer = await this.ctx!.decodeAudioData(copy)
      } catch {
        /* video may not decode as audio in this browser */
      }
      return Number.isFinite(video.duration) ? video.duration : 8
    }
    const copy = await file.arrayBuffer()
    current.buffer = await this.ctx!.decodeAudioData(copy)
    this.media.set(id, current)
    return current.buffer.duration
  }

  setMasterVolume(v: number): void {
    if (this.master) this.master.gain.value = clamp(v, 0, 1.4)
  }

  setMasterFx(filter: number, reverb: number, delay: number, drive: number): void {
    if (!this.ctx || !this.masterFilter || !this.reverbGain || !this.delayGain || !this.drive) return
    const spec = filterFromKnob(filter)
    if (!spec) {
      this.masterFilter.type = 'allpass'
      this.masterFilter.frequency.value = 10000
    } else {
      this.masterFilter.type = spec.type
      this.masterFilter.frequency.value = spec.freq
    }
    this.reverbGain.gain.value = clamp(reverb, 0, 1) * 0.7
    this.delayGain.gain.value = clamp(delay, 0, 1) * 0.55
    this.drive.curve = makeDriveCurve(clamp(drive, 0, 1)) as Float32Array<ArrayBuffer>
  }

  getTime(): number {
    if (!this.ctx || !this.playing) return this.pausedAt
    return this.pausedAt + (this.ctx.currentTime - this.startedAt)
  }

  isPlaying(): boolean {
    return this.playing
  }

  seek(time: number): void {
    const next = Math.max(0, time)
    const was = this.playing
    if (was) this.stopSources(false)
    this.pausedAt = next
    if (was) this.play(this.projectTimeLength, this.loop, this.loopStart, this.loopEnd)
  }

  stop(): void {
    this.stopSources(false)
    this.playing = false
    this.pausedAt = 0
    this.pauseVideos()
  }

  pause(): void {
    this.pausedAt = this.getTime()
    this.stopSources(false)
    this.playing = false
    this.pauseVideos()
  }

  play(duration: number, loop: boolean, loopStart: number, loopEnd: number): void {
    if (!this.ctx || !this.master) return
    this.projectTimeLength = duration
    this.loop = loop
    this.loopStart = loopStart
    this.loopEnd = loopEnd
    this.stopSources(true)
    this.playing = true
    this.startedAt = this.ctx.currentTime
    if (this.mode === 'studio') this.scheduleTimeline()
  }

  updateLiveTracks(): void {
    if (!this.ctx) return
    const tracks = this.getTracks()
    const soloed = anySolo(tracks)
    const ids = new Set(tracks.map((track) => track.id))
    for (const [id, chain] of this.chains) {
      if (!ids.has(id)) {
        try {
          chain.input.disconnect()
        } catch {
          /* already gone */
        }
        this.chains.delete(id)
      }
    }
    for (const track of tracks) {
      const chain = this.chains.get(track.id)
      if (chain) this.applyTrack(chain, track, soloed)
    }
  }

  private scheduleTimeline(): void {
    if (!this.ctx || !this.master) return
    const now = this.ctx.currentTime
    const t0 = this.pausedAt
    const tracks = this.getTracks()
    const clips = this.getClips()
    const soloed = anySolo(tracks)
    this.pruneChains(tracks)
    for (const track of tracks) this.getOrMakeChain(track, soloed)
    for (const clip of clips) {
      const track = tracks.find((tr) => tr.id === clip.trackId)
      if (!track) continue
      const media = this.media.get(clip.mediaId)
      if (!media?.buffer) continue
      const start = clip.start
      const end = clipEnd(clip)
      if (end <= t0) continue
      const source = this.ctx.createBufferSource()
      source.buffer = media.buffer
      source.playbackRate.value = clip.playbackRate
      const gain = this.ctx.createGain()
      gain.connect(this.getOrMakeChain(track, soloed))
      source.connect(gain)
      const offset = clip.offset + Math.max(0, t0 - start) * clip.playbackRate
      const when = now + Math.max(0, start - t0)
      const playDur = (end - Math.max(t0, start)) / clip.playbackRate
      const localAtStart = Math.max(0, t0 - start)
      applyFades(gain.gain, this.ctx, when, localAtStart, clip, playDur)
      try {
        source.start(when, offset, playDur)
      } catch {
        continue
      }
      this.sources.push({ source, gain })
    }
    if (this.getPicture().metronome) this.scheduleMetronome(now, t0)
  }

  private scheduleMetronome(now: number, t0: number): void {
    if (!this.ctx || !this.click || !this.master) return
    const bpm = this.getPicture().bpm || 120
    const step = 60 / bpm
    const startBeat = Math.ceil(t0 / step - 0.0001)
    for (let i = startBeat; i * step < this.projectTimeLength; i++) {
      const at = i * step
      if (at < t0) continue
      const source = this.ctx.createBufferSource()
      source.buffer = this.click
      const gain = this.ctx.createGain()
      gain.gain.value = i % 4 === 0 ? 0.28 : 0.12
      source.connect(gain)
      gain.connect(this.master)
      source.start(now + (at - t0))
      this.sources.push({ source, gain })
    }
  }

  private pruneChains(tracks: Track[]): void {
    const ids = new Set(tracks.map((track) => track.id))
    for (const [id, chain] of this.chains) {
      if (ids.has(id)) continue
      try {
        chain.input.disconnect()
      } catch {
        /* already gone */
      }
      this.chains.delete(id)
    }
  }

  private getOrMakeChain(track: Track, soloed: boolean): GainNode {
    let chain = this.chains.get(track.id)
    if (!chain) {
      chain = this.makeTrackChain(track)
      this.chains.set(track.id, chain)
    }
    this.applyTrack(chain, track, soloed)
    return chain.input
  }

  private applyTrack(chain: TrackChain, track: Track, soloed: boolean): void {
    if (!this.ctx) return
    const audible = trackAudible(track, soloed)
    const now = this.ctx.currentTime
    chain.vol.gain.setTargetAtTime(audible ? track.volume : 0, now, 0.03)
    chain.pan.pan.setTargetAtTime(track.pan, now, 0.03)
    chain.low.gain.setTargetAtTime(track.eq.low, now, 0.03)
    chain.mid.gain.setTargetAtTime(track.eq.mid, now, 0.03)
    chain.high.gain.setTargetAtTime(track.eq.high, now, 0.03)
    chain.wet.gain.setTargetAtTime(track.delay * 0.5, now, 0.04)
    const spec = filterFromKnob(track.filter)
    if (!spec) {
      chain.filter.type = 'allpass'
      chain.filter.frequency.value = 10000
    } else {
      chain.filter.type = spec.type
      chain.filter.frequency.value = spec.freq
    }
  }

  private makeTrackChain(track: Track): TrackChain {
    const ctx = this.ctx!
    const input = ctx.createGain()
    const vol = ctx.createGain()
    vol.gain.value = track.volume
    const pan = ctx.createStereoPanner()
    pan.pan.value = track.pan
    const low = ctx.createBiquadFilter()
    low.type = 'lowshelf'
    low.frequency.value = 120
    low.gain.value = track.eq.low
    const mid = ctx.createBiquadFilter()
    mid.type = 'peaking'
    mid.frequency.value = 1000
    mid.Q.value = 0.8
    mid.gain.value = track.eq.mid
    const high = ctx.createBiquadFilter()
    high.type = 'highshelf'
    high.frequency.value = 8000
    high.gain.value = track.eq.high
    const filter = ctx.createBiquadFilter()
    filter.type = 'allpass'
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.22
    const wet = ctx.createGain()
    wet.gain.value = track.delay * 0.5
    const dry = ctx.createGain()
    dry.gain.value = 1
    input.connect(vol)
    vol.connect(pan)
    pan.connect(low)
    low.connect(mid)
    mid.connect(high)
    high.connect(filter)
    filter.connect(dry)
    filter.connect(delay)
    delay.connect(wet)
    dry.connect(this.master!)
    wet.connect(this.master!)
    return { input, vol, pan, low, mid, high, filter, wet }
  }

  private makeDeckGraph(): DeckGraph {
    const ctx = this.ctx!
    const gain = ctx.createGain()
    const low = ctx.createBiquadFilter()
    low.type = 'lowshelf'
    low.frequency.value = 120
    const mid = ctx.createBiquadFilter()
    mid.type = 'peaking'
    mid.frequency.value = 1000
    const high = ctx.createBiquadFilter()
    high.type = 'highshelf'
    high.frequency.value = 8000
    const filter = ctx.createBiquadFilter()
    filter.type = 'allpass'
    gain.connect(low)
    low.connect(mid)
    mid.connect(high)
    high.connect(filter)
    filter.connect(this.master!)
    return { source: null, gain, low, mid, high, filter, startedAt: 0, origin: 0 }
  }

  applyDeck(which: 'a' | 'b', deck: Deck, xf: number): void {
    const graph = which === 'a' ? this.deckA : this.deckB
    if (!graph || !this.ctx) return
    const [aGain, bGain] = equalPower(xf)
    graph.gain.gain.value = deck.volume * (which === 'a' ? aGain : bGain)
    graph.low.gain.value = deck.eq.low
    graph.mid.gain.value = deck.eq.mid
    graph.high.gain.value = deck.eq.high
    const spec = filterFromKnob(deck.filter)
    if (!spec) {
      graph.filter.type = 'allpass'
      graph.filter.frequency.value = 10000
    } else {
      graph.filter.type = spec.type
      graph.filter.frequency.value = spec.freq
    }
    if (graph.source) graph.source.playbackRate.value = deck.rate
  }

  async playDeck(which: 'a' | 'b', deck: Deck): Promise<void> {
    await this.ensure()
    const graph = which === 'a' ? this.deckA : this.deckB
    if (!graph || !this.ctx || !deck.mediaId) return
    const media = this.media.get(deck.mediaId)
    if (!media?.buffer) return
    if (graph.source) {
      try {
        graph.source.stop()
      } catch {
        /* already stopped */
      }
    }
    const source = this.ctx.createBufferSource()
    source.buffer = media.buffer
    source.loop = deck.loop
    source.playbackRate.value = deck.rate
    source.connect(graph.gain)
    const offset = deck.position % media.buffer.duration
    source.start(0, offset)
    graph.source = source
    graph.startedAt = this.ctx.currentTime
    graph.origin = offset
    if (media.video) {
      media.video.currentTime = offset
      void media.video.play()
      graph.video = media.video
    }
  }

  stopDeck(which: 'a' | 'b'): void {
    const graph = which === 'a' ? this.deckA : this.deckB
    if (!graph?.source) return
    try {
      graph.source.stop()
    } catch {
      /* already stopped */
    }
    graph.source = null
    graph.video?.pause()
  }

  deckPosition(which: 'a' | 'b', deck: Deck): number {
    const graph = which === 'a' ? this.deckA : this.deckB
    const media = deck.mediaId ? this.media.get(deck.mediaId) : undefined
    const dur = media?.buffer?.duration ?? 0
    if (!graph || !this.ctx || !deck.playing || !dur) return deck.position
    const elapsed = (this.ctx.currentTime - graph.startedAt) * deck.rate
    const pos = graph.origin + elapsed
    return deck.loop ? ((pos % dur) + dur) % dur : Math.min(dur, pos)
  }

  private stopSources(keepTime: boolean): void {
    for (const active of this.sources) {
      try {
        active.source.stop()
      } catch {
        /* already stopped */
      }
    }
    this.sources = []
    if (!keepTime) this.pauseVideos()
  }

  private pauseVideos(): void {
    for (const media of this.media.values()) media.video?.pause()
  }

  getLevels(): { bass: number; mids: number; highs: number; peak: number; spectrum: Uint8Array } {
    if (!this.analyser) {
      return { bass: 0, mids: 0, highs: 0, peak: 0, spectrum: this.freq }
    }
    this.analyser.getByteFrequencyData(this.freq)
    this.analyser.getByteTimeDomainData(this.timeDomain)
    const band = (from: number, to: number) => {
      let sum = 0
      for (let i = from; i < to && i < this.freq.length; i++) sum += this.freq[i] ?? 0
      return sum / Math.max(1, to - from) / 255
    }
    let peak = 0
    for (const v of this.timeDomain) peak = Math.max(peak, Math.abs(v - 128) / 128)
    return {
      bass: band(0, 8),
      mids: band(8, 40),
      highs: band(40, 120),
      peak,
      spectrum: this.freq,
    }
  }

  async startRecording(): Promise<void> {
    await this.ensure()
    if (!this.canvas || !this.recordDest) return
    const canvasStream = this.canvas.captureStream(30)
    const mixed = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...this.recordDest.stream.getAudioTracks(),
    ])
    const mime = pickMime()
    this.chunks = []
    this.recorder = new MediaRecorder(mixed, mime ? { mimeType: mime } : undefined)
    this.recorder.ondataavailable = (event) => {
      if (event.data.size) this.chunks.push(event.data)
    }
    this.recorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: mime || 'video/webm' })
      this.onRecorded?.(blob, blob.type)
      this.recording = false
    }
    this.recorder.start(200)
    this.recording = true
  }

  stopRecording(): void {
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop()
    this.recorder = null
  }

  async bounceWav(duration: number): Promise<Blob> {
    await this.ensure()
    const sr = this.ctx!.sampleRate
    const offline = new OfflineAudioContext(2, Math.floor(sr * duration), sr)
    const tracks = this.getTracks()
    const clips = this.getClips()
    const soloed = anySolo(tracks)
    const master = offline.createGain()
    master.gain.value = 0.9
    master.connect(offline.destination)
    for (const clip of clips) {
      const track = tracks.find((tr) => tr.id === clip.trackId)
      if (!track || !trackAudible(track, soloed)) continue
      const media = this.media.get(clip.mediaId)
      if (!media?.buffer) continue
      const source = offline.createBufferSource()
      source.buffer = media.buffer
      source.playbackRate.value = clip.playbackRate
      const gain = offline.createGain()
      const vol = offline.createGain()
      vol.gain.value = track.volume * clip.gain
      source.connect(gain)
      gain.connect(vol)
      vol.connect(master)
      applyFades(gain.gain, offline, clip.start, 0, clip, clip.duration)
      try {
        source.start(clip.start, clip.offset, clip.duration / clip.playbackRate)
      } catch {
        continue
      }
    }
    const rendered = await offline.startRendering()
    return encodeWav(rendered)
  }

  private startLoop(): void {
    if (this.raf) return
    const tick = () => {
      this.raf = requestAnimationFrame(tick)
      let time = this.getTime()
      if (this.playing && this.loop && time >= this.loopEnd) {
        this.seek(this.loopStart)
        time = this.loopStart
      } else if (this.playing && this.mode === 'studio' && time >= this.projectTimeLength) {
        this.pause()
        this.pausedAt = this.projectTimeLength
        time = this.pausedAt
      }
      this.draw(time)
      this.syncVideos(time)
      this.onTime?.(time)
    }
    this.raf = requestAnimationFrame(tick)
  }

  private syncVideos(time: number): void {
    if (this.mode !== 'studio' || !this.playing) return
    const clips = this.getClips()
    const tracks = this.getTracks()
    for (const clip of clips) {
      const track = tracks.find((tr) => tr.id === clip.trackId)
      if (!track || track.kind !== 'video') continue
      if (!clipAtTime(clip, time)) continue
      const media = this.media.get(clip.mediaId)
      const video = media?.video
      if (!video) continue
      const local = clip.offset + (time - clip.start) * clip.playbackRate
      if (Math.abs(video.currentTime - local) > 0.12) video.currentTime = local
      if (video.paused) void video.play()
    }
  }

  private draw(time: number): void {
    const canvas = this.canvas
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w === 0 || h === 0) return
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#07070c'
    ctx.fillRect(0, 0, w, h)
    const levels = this.getLevels()
    const picture = this.getPicture()
    const bass = picture.reactive ? Math.min(1, levels.bass * 1.45) : levels.bass * 0.7
    const assets = this.getAssets()
    if (this.mode === 'dj') {
      this.drawDj(ctx, w, h, { ...levels, bass })
      applyLook(ctx, w, h, picture.look, time)
      return
    }
    const clips = [...this.getClips()].sort((a, b) => a.start - b.start)
    const tracks = this.getTracks()
    let drew = false
    for (const clip of clips) {
      const track = tracks.find((tr) => tr.id === clip.trackId)
      if (!track || track.kind !== 'video') continue
      if (!clipAtTime(clip, time)) continue
      const asset = assets.find((a) => a.id === clip.mediaId)
      const loaded = this.media.get(clip.mediaId)
      const local = time - clip.start
      const alpha = fadeGain(local, clip.duration, clip.fadeIn, clip.fadeOut, clip.opacity)
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.globalCompositeOperation = clip.blend as GlobalCompositeOperation
      if (asset?.visual) {
        ctx.translate(clip.x, clip.y)
        drawVisual(ctx, w, h, {
          kind: asset.visual,
          time,
          hue: clip.hue,
          text: clip.text,
          bass,
          mids: levels.mids,
          highs: levels.highs,
          spectrum: levels.spectrum,
          opacity: 1,
        })
        drew = true
      } else if (loaded?.video) {
        ctx.translate(w / 2 + clip.x, h / 2 + clip.y)
        ctx.scale(clip.scale, clip.scale)
        ctx.translate(-w / 2, -h / 2)
        drawMedia(ctx, loaded.video, w, h)
        drew = true
      } else if (loaded?.image) {
        ctx.translate(w / 2 + clip.x, h / 2 + clip.y)
        ctx.scale(clip.scale * (1 + bass * 0.04), clip.scale * (1 + bass * 0.04))
        ctx.translate(-w / 2, -h / 2)
        drawMedia(ctx, loaded.image, w, h)
        drew = true
      }
      ctx.restore()
    }
    if (!drew) {
      drawVisual(ctx, w, h, {
        kind: 'horizon',
        time,
        hue: 32,
        text: 'SERIOUS EDITS',
        bass,
        mids: levels.mids,
        highs: levels.highs,
        spectrum: levels.spectrum,
        opacity: 0.9,
      })
    }
    drawLowerThird(ctx, w, h, picture.subtitle)
    applyLook(ctx, w, h, picture.look, time)
    this.drawHud(ctx, w, h, time, levels.peak)
  }

  private drawDj(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    levels: { bass: number; mids: number; highs: number; peak: number; spectrum: Uint8Array },
  ): void {
    const { a, b, xf } = this.getDecks()
    const [ag, bg] = equalPower(xf)
    const decks: { deck: Deck; alpha: number }[] = [
      { deck: a, alpha: ag },
      { deck: b, alpha: bg },
    ]
    const assets = this.getAssets()
    ctx.fillStyle = '#050508'
    ctx.fillRect(0, 0, w, h)
    for (const { deck, alpha } of decks) {
      if (!deck.mediaId) continue
      const asset = assets.find((item) => item.id === deck.mediaId)
      const loaded = this.media.get(deck.mediaId)
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.globalCompositeOperation = 'screen'
      if (asset?.visual) {
        drawVisual(ctx, w, h, {
          kind: asset.visual,
          time: deck.position,
          hue: whichHue(asset.color),
          text: asset.name,
          bass: levels.bass,
          mids: levels.mids,
          highs: levels.highs,
          spectrum: levels.spectrum,
          opacity: 1,
        })
      } else if (loaded?.video) {
        drawMedia(ctx, loaded.video, w, h)
      }
      ctx.restore()
    }
    this.drawHud(ctx, w, h, this.getTime(), levels.peak)
  }

  private drawHud(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    peak: number,
  ): void {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(16, h - 54, 168, 36)
    ctx.fillStyle = '#f0d29a'
    ctx.font = '500 13px "IBM Plex Mono", monospace'
    const mm = String(Math.floor(time / 60)).padStart(2, '0')
    const ss = String(Math.floor(time % 60)).padStart(2, '0')
    const ms = String(Math.floor((time % 1) * 1000)).padStart(3, '0')
    ctx.fillText(`${mm}:${ss}.${ms}`, 28, h - 30)
    if (this.recording) {
      ctx.fillStyle = 'rgba(255,90,122,0.9)'
      ctx.beginPath()
      ctx.arc(w - 28, 28, 7, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = `rgba(62,224,197,${0.2 + peak * 0.7})`
    ctx.fillRect(w - 18, h - 24 - peak * (h * 0.4), 6, peak * (h * 0.4))
  }
}

function emptyDeck(): Deck {
  return {
    mediaId: null,
    playing: false,
    position: 0,
    rate: 1,
    volume: 0.85,
    eq: { low: 0, mid: 0, high: 0 },
    filter: 0,
    cue: 0,
    loop: true,
    hotCues: [-1, -1, -1, -1],
  }
}

function applyFades(
  param: AudioParam,
  _ctx: BaseAudioContext,
  when: number,
  localAtStart: number,
  clip: Clip,
  playDur: number,
): void {
  const gain = clip.gain
  param.cancelScheduledValues(when)
  param.setValueAtTime(fadeGain(localAtStart, clip.duration, clip.fadeIn, clip.fadeOut, gain), when)
  if (clip.fadeIn > localAtStart) {
    const remain = clip.fadeIn - localAtStart
    param.linearRampToValueAtTime(gain, when + remain)
  }
  const fadeOutStart = Math.max(0, playDur - clip.fadeOut)
  if (clip.fadeOut > 0) {
    param.setValueAtTime(gain, when + fadeOutStart)
    param.linearRampToValueAtTime(0.0001, when + playDur)
  }
}

function makeImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay
    }
  }
  return buffer
}

function makeDriveCurve(amount: number): Float32Array {
  const n = 256
  const curve = new Float32Array(n)
  const k = amount * 18
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    curve[i] = amount === 0 ? x : ((1 + k) * x) / (1 + k * Math.abs(x))
  }
  return curve
}

function makeClick(ctx: AudioContext): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * 0.04)
  const buffer = ctx.createBuffer(1, n, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < n; i++) {
    const t = i / ctx.sampleRate
    data[i] = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 80)
  }
  return buffer
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image'))
    image.src = url
  })
}

function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.src = url
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.onloadedmetadata = () => resolve(video)
    video.onerror = () => reject(new Error('video'))
  })
}

function drawMedia(
  ctx: CanvasRenderingContext2D,
  media: HTMLVideoElement | HTMLImageElement,
  w: number,
  h: number,
): void {
  const mw = 'videoWidth' in media ? media.videoWidth || media.width : media.width
  const mh = 'videoHeight' in media ? media.videoHeight || media.height : media.height
  if (!mw || !mh) return
  const scale = Math.max(w / mw, h / mh)
  const dw = mw * scale
  const dh = mh * scale
  ctx.drawImage(media, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

function pickMime(): string {
  const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

function whichHue(color: string): number {
  if (color.startsWith('#3e')) return 168
  if (color.startsWith('#8b')) return 250
  if (color.startsWith('#e0')) return 12
  return 38
}

export function isAudioFile(file: File): boolean {
  return file.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac|aiff)$/i.test(file.name)
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name)
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(file.name)
}

export const engine = new StudioEngine()

export function peaksFromBuffer(buffer: AudioBuffer): number[] {
  const ch = buffer.getChannelData(0)
  const buckets = 720
  const block = Math.max(1, Math.floor(ch.length / buckets))
  const peaks = new Array<number>(buckets)
  for (let i = 0; i < buckets; i++) {
    let max = 0
    const start = i * block
    for (let s = start; s < start + block && s < ch.length; s++) max = Math.max(max, Math.abs(ch[s] ?? 0))
    peaks[i] = max
  }
  return peaks
}