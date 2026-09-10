import { describe, expect, it } from 'vitest'
import { encodeMp3FromChannels, floatToInt16 } from './encodeMp3'

describe('mp3 encoder', () => {
  it('converts floats to 16-bit samples', () => {
    const out = floatToInt16(new Float32Array([0, 1, -1, 0.5]))
    expect(out[0]).toBe(0)
    expect(out[1]).toBe(0x7fff)
    expect(out[2]).toBe(-0x8000)
    expect(out[3]).toBeGreaterThan(10000)
  })

  it('encodes a short sine into an MPEG frame', async () => {
    const sr = 44100
    const length = 44100
    const left = new Float32Array(length)
    const right = new Float32Array(length)
    for (let i = 0; i < length; i++) {
      const s = Math.sin((2 * Math.PI * 440 * i) / sr) * 0.2
      left[i] = s
      right[i] = s
    }
    const blob = encodeMp3FromChannels([left, right], sr, 128)
    expect(blob.size).toBeGreaterThan(200)
    expect(blob.type).toBe('audio/mpeg')
    const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer())
    expect(head[0]).toBe(0xff)
    expect((head[1] ?? 0) & 0xe0).toBe(0xe0)
  })
})
