import { describe, expect, it } from 'vitest'
import type { Clip, MediaAsset } from '../types'
import { createClip } from './clips'
import { aspectPair, autoCrossfadeTrack, scoreVisuals } from './looks'

function visual(id: string): MediaAsset {
  return {
    id,
    name: id,
    kind: 'visual',
    duration: 8,
    color: '#fff',
    visual: 'aurora',
    hasAudio: false,
  }
}

function clip(id: string, start: number, duration: number): Clip {
  return createClip({
    id,
    trackId: 't',
    mediaId: 'm',
    start,
    duration,
    fadeIn: 0,
    fadeOut: 0,
    hue: 0,
    text: '',
  })
}

describe('looks helpers', () => {
  it('maps aspect ratios', () => {
    expect(aspectPair('16:9')).toEqual([16, 9])
    expect(aspectPair('9:16')).toEqual([9, 16])
    expect(aspectPair('1:1')).toEqual([1, 1])
  })

  it('scores visuals across the song on a 2-bar grid', () => {
    const scored = scoreVisuals([visual('a'), visual('b')], 16, 120)
    expect(scored.length).toBe(4)
    expect(scored[0]?.start).toBe(0)
    expect(scored[0]?.duration).toBe(4)
    expect(scored[1]?.mediaId).toBe('b')
  })

  it('crossfades abutting clips', () => {
    const next = autoCrossfadeTrack([clip('1', 0, 4), clip('2', 4, 4)], 0.5)
    expect(next[1]?.start).toBeCloseTo(3.5)
    expect(next[0]?.fadeOut).toBe(0.5)
    expect(next[1]?.fadeIn).toBe(0.5)
  })
})
