import { describe, expect, it } from 'vitest'
import { clipAtTime, clipEnd, projectLength, splitClip, trimClip } from './clips'
import type { Clip } from '../types'

function clip(patch: Partial<Clip> = {}): Clip {
  return {
    id: 'a',
    trackId: 't',
    mediaId: 'm',
    start: 2,
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
    hue: 0,
    text: '',
    ...patch,
  }
}

describe('clips', () => {
  it('splits a clip and preserves source offset', () => {
    const parts = splitClip(clip(), 4, 'b')
    expect(parts).not.toBeNull()
    expect(parts?.[0].duration).toBe(2)
    expect(parts?.[1].start).toBe(4)
    expect(parts?.[1].offset).toBe(2)
  })

  it('trims edges without inverting the clip', () => {
    const left = trimClip(clip(), 'start', 3, 10)
    expect(left.start).toBe(3)
    expect(left.duration).toBe(3)
    expect(left.offset).toBe(1)
    const right = trimClip(clip(), 'end', 5, 10)
    expect(right.duration).toBe(3)
  })

  it('detects overlap and project length', () => {
    expect(clipAtTime(clip(), 3)).toBe(true)
    expect(clipAtTime(clip(), 7)).toBe(false)
    expect(clipEnd(clip())).toBe(6)
    expect(projectLength([clip()], 1)).toBeGreaterThanOrEqual(10)
  })
})
