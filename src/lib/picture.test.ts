import { describe, expect, it } from 'vitest'
import {
  aspectExportSize,
  audioMixLength,
  extensionForMime,
  fitPictureClips,
  pickRecorderMime,
  VIDEO_MIME_CANDIDATES,
} from './picture'
import { createClip } from './clips'

describe('picture export helpers', () => {
  it('maps aspect ratios to export frames', () => {
    expect(aspectExportSize('16:9')).toEqual({ width: 1280, height: 720 })
    expect(aspectExportSize('9:16')).toEqual({ width: 720, height: 1280 })
    expect(aspectExportSize('1:1')).toEqual({ width: 1080, height: 1080 })
  })

  it('prefers MP4 when the browser can encode it', () => {
    const mime = pickRecorderMime(VIDEO_MIME_CANDIDATES, (type) => type.startsWith('video/mp4'))
    expect(mime).toContain('mp4')
    expect(extensionForMime('video/mp4')).toBe('mp4')
    expect(extensionForMime('audio/mpeg')).toBe('mp3')
    expect(extensionForMime('video/webm;codecs=vp9')).toBe('webm')
  })

  it('loops picture clips to cover the audio mix', () => {
    const video = createClip({ id: 'v', trackId: 'vis', mediaId: 'clip', start: 0, duration: 4 })
    const song = createClip({ id: 'a', trackId: 'aud', mediaId: 'song', start: 0, duration: 16 })
    expect(audioMixLength([video, song], ['aud'], 8)).toBe(16)
    const fitted = fitPictureClips([video, song], ['vis'], 16)
    expect(fitted[0]?.loop).toBe(true)
    expect(fitted[0]?.duration).toBe(16)
    expect(fitted[1]?.loop).toBe(false)
  })
})
