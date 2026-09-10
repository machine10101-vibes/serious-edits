import { describe, expect, it } from 'vitest'
import { buildDemoStems, renderHat, renderKick, renderSnare } from './demoAudio'
import { normalizePeak } from './mix'

describe('demo audio', () => {
  it('renders percussive hits that decay', () => {
    const kick = renderKick(22050, 0.4)
    const snare = renderSnare(22050, 0.3)
    const hat = renderHat(22050)
    expect(kick[20]).not.toBe(0)
    expect(Math.abs(kick[20] ?? 0)).toBeGreaterThan(Math.abs(kick[kick.length - 1] ?? 0))
    expect(snare.length).toBeGreaterThan(100)
    expect(hat.length).toBeGreaterThan(50)
  })

  it('builds four demo stems at 120 bpm', () => {
    const stems = buildDemoStems(22050)
    expect(stems).toHaveLength(4)
    expect(stems[0]?.duration).toBeCloseTo(16)
    expect(stems.every((stem) => stem.samples.length > 1000)).toBe(true)
  })

  it('normalizes peaks', () => {
    const data = new Float32Array([0, 2, -2, 0])
    expect(normalizePeak(data, 1)).toBe(2)
    expect(Math.max(...data)).toBeCloseTo(1)
  })
})
