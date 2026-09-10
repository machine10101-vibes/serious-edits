import type { AspectRatio, Clip } from '../types'
import { clipEnd } from './clips'

export function aspectExportSize(aspect: AspectRatio): { width: number; height: number } {
  if (aspect === '9:16') return { width: 720, height: 1280 }
  if (aspect === '1:1') return { width: 1080, height: 1080 }
  return { width: 1280, height: 720 }
}

export const VIDEO_MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
] as const

export function pickRecorderMime(
  candidates: readonly string[],
  isSupported: (type: string) => boolean,
): string {
  return candidates.find((type) => isSupported(type)) ?? ''
}

export function extensionForMime(mime: string): string {
  if (mime.includes('mp4')) return 'mp4'
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3'
  if (mime.includes('wav')) return 'wav'
  return 'webm'
}

export function audioMixLength(
  clips: Clip[],
  audioTrackIds: Iterable<string>,
  fallback: number,
): number {
  const ids = new Set(audioTrackIds)
  const end = clips.filter((clip) => ids.has(clip.trackId)).reduce((max, clip) => Math.max(max, clipEnd(clip)), 0)
  return Math.max(fallback, end)
}

export function fitPictureClips(clips: Clip[], videoTrackIds: Iterable<string>, mixLength: number): Clip[] {
  const ids = new Set(videoTrackIds)
  return clips.map((clip) => {
    if (!ids.has(clip.trackId)) return clip
    return {
      ...clip,
      loop: true,
      duration: Math.max(0.05, mixLength - clip.start),
    }
  })
}
