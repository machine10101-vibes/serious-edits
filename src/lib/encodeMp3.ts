import './lamePolyfill'
import lamejs from 'lamejs'

interface LameModule {
  Mp3Encoder: new (channels: number, sampleRate: number, kbps: number) => {
    encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array
    flush(): Int8Array
  }
}

const BLOCK = 1152

function lame(): LameModule {
  const mod = lamejs as unknown as LameModule & { default?: LameModule }
  return mod.Mp3Encoder ? mod : (mod.default as LameModule)
}

export function floatToInt16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i] ?? 0))
    out[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return out
}

export function encodeMp3FromChannels(channels: Float32Array[], sampleRate: number, kbps = 192): Blob {
  const count = Math.min(2, Math.max(1, channels.length))
  const leftSrc = channels[0] ?? new Float32Array(0)
  const rightSrc = count > 1 ? (channels[1] ?? leftSrc) : leftSrc
  const length = Math.min(leftSrc.length, rightSrc.length)
  const left = floatToInt16(leftSrc.subarray(0, length))
  const right = floatToInt16(rightSrc.subarray(0, length))
  const encoder = new (lame().Mp3Encoder)(count, sampleRate, kbps)
  const parts: BlobPart[] = []
  for (let i = 0; i < length; i += BLOCK) {
    const end = Math.min(length, i + BLOCK)
    const chunk =
      count === 1
        ? encoder.encodeBuffer(left.subarray(i, end))
        : encoder.encodeBuffer(left.subarray(i, end), right.subarray(i, end))
    if (chunk.length) parts.push(Uint8Array.from(chunk))
  }
  const tail = encoder.flush()
  if (tail.length) parts.push(Uint8Array.from(tail))
  return new Blob(parts, { type: 'audio/mpeg' })
}

export function encodeMp3(buffer: AudioBuffer, kbps = 192): Blob {
  const channels: Float32Array[] = []
  for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i))
  return encodeMp3FromChannels(channels, buffer.sampleRate, kbps)
}
