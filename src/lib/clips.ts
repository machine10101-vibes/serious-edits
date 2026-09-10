import type { Clip } from '../types'

export function createClip(
  patch: Partial<Clip> & Pick<Clip, 'id' | 'trackId' | 'mediaId'>,
): Clip {
  return {
    start: 0,
    duration: 4,
    offset: 0,
    gain: 1,
    fadeIn: 0,
    fadeOut: 0,
    playbackRate: 1,
    opacity: 1,
    blend: 'source-over',
    scale: 1,
    x: 0,
    y: 0,
    hue: 32,
    text: '',
    audioEnabled: true,
    fit: 'cover',
    loop: false,
    ...patch,
  }
}

export function clipEnd(clip: Clip): number {
  return clip.start + clip.duration
}

export function clipAtTime(clip: Clip, time: number): boolean {
  return time >= clip.start && time < clipEnd(clip)
}

export function splitClip(clip: Clip, time: number, newId: string): [Clip, Clip] | null {
  if (time <= clip.start + 0.04 || time >= clipEnd(clip) - 0.04) return null
  const local = time - clip.start
  const left: Clip = { ...clip, duration: local, fadeOut: Math.min(clip.fadeOut, local) }
  const right: Clip = {
    ...clip,
    id: newId,
    start: time,
    offset: clip.offset + local * clip.playbackRate,
    duration: clip.duration - local,
    fadeIn: Math.min(clip.fadeIn, clip.duration - local),
  }
  return [left, right]
}

export function moveClip(clip: Clip, start: number): Clip {
  return { ...clip, start: Math.max(0, start) }
}

export function trimClip(
  clip: Clip,
  edge: 'start' | 'end',
  time: number,
  maxDuration: number,
): Clip {
  if (edge === 'end') {
    const duration = Math.max(0.05, Math.min(maxDuration - clip.offset, time - clip.start))
    return { ...clip, duration }
  }
  const end = clipEnd(clip)
  const nextStart = Math.max(0, Math.min(time, end - 0.05))
  const delta = nextStart - clip.start
  return {
    ...clip,
    start: nextStart,
    offset: Math.max(0, clip.offset + delta * clip.playbackRate),
    duration: Math.max(0.05, end - nextStart),
  }
}

export function projectLength(clips: Clip[], fallback = 32): number {
  const end = clips.reduce((max, clip) => Math.max(max, clipEnd(clip)), 0)
  return Math.max(fallback, Math.ceil(end + 4))
}

export function anySolo(tracks: { solo: boolean }[]): boolean {
  return tracks.some((track) => track.solo)
}

export function trackAudible(
  track: { muted: boolean; solo: boolean },
  soloed: boolean,
): boolean {
  if (track.muted) return false
  if (soloed && !track.solo) return false
  return true
}

export function mediaLocalTime(
  clip: Pick<Clip, 'start' | 'offset' | 'playbackRate' | 'loop'>,
  time: number,
  mediaDuration: number,
): number {
  const local = clip.offset + (time - clip.start) * clip.playbackRate
  if (!clip.loop || mediaDuration <= 0) return local
  const wrapped = local % mediaDuration
  return wrapped < 0 ? wrapped + mediaDuration : wrapped
}
