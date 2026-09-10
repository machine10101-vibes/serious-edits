import { describe, expect, it } from 'vitest'
import { clampZoom, formatBars, formatTimecode, snapTime, xToTime } from './time'

describe('time', () => {
  it('formats timecode with milliseconds', () => {
    expect(formatTimecode(0)).toBe('00:00.000')
    expect(formatTimecode(65.25)).toBe('01:05.250')
  })

  it('snaps to the beat grid', () => {
    expect(snapTime(0.24, 120, 4, true)).toBeCloseTo(0.25)
    expect(snapTime(0.24, 120, 4, false)).toBeCloseTo(0.24)
  })

  it('maps pixels to seconds', () => {
    expect(xToTime(112, 56, 0)).toBe(2)
  })

  it('clamps zoom and reports bars', () => {
    expect(clampZoom(8)).toBe(16)
    expect(formatBars(2, 120)).toBe('2.1')
  })
})
