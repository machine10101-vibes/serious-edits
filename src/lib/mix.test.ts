import { describe, expect, it } from 'vitest'
import { cutCrossfade, dbToGain, equalPower, fadeGain, filterFromKnob, linearCrossfade } from './mix'

describe('mix math', () => {
  it('uses equal-power crossfade at center', () => {
    const [a, b] = equalPower(0.5)
    expect(a).toBeCloseTo(Math.SQRT1_2, 5)
    expect(b).toBeCloseTo(Math.SQRT1_2, 5)
  })

  it('fades clips in and out', () => {
    expect(fadeGain(0, 4, 1, 1, 1)).toBeCloseTo(0)
    expect(fadeGain(1, 4, 1, 1, 1)).toBeCloseTo(1)
    expect(fadeGain(4, 4, 1, 1, 1)).toBeCloseTo(0)
  })

  it('maps filter knob to lowpass and highpass', () => {
    expect(filterFromKnob(0)).toBeNull()
    expect(filterFromKnob(-1)?.type).toBe('lowpass')
    expect(filterFromKnob(1)?.type).toBe('highpass')
  })

  it('converts decibels and other curves', () => {
    expect(dbToGain(0)).toBe(1)
    expect(linearCrossfade(0.25)).toEqual([0.75, 0.25])
    expect(cutCrossfade(0.49)).toEqual([1, 0])
    expect(cutCrossfade(0.5)).toEqual([0, 1])
  })
})
