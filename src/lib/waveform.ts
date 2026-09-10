export function computePeaks(channel: Float32Array, buckets = 720): number[] {
  const peaks = new Array<number>(buckets).fill(0)
  const block = Math.max(1, Math.floor(channel.length / buckets))
  for (let i = 0; i < buckets; i++) {
    let max = 0
    const start = i * block
    const end = Math.min(channel.length, start + block)
    for (let s = start; s < end; s++) {
      max = Math.max(max, Math.abs(channel[s] ?? 0))
    }
    peaks[i] = max
  }
  return peaks
}

export function drawWaveform(
  canvas: HTMLCanvasElement,
  peaks: number[],
  color: string,
  progress?: number,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (width === 0 || height === 0) return
  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  const mid = height / 2
  const played = progress == null ? 1 : Math.max(0, Math.min(1, progress))
  ctx.lineWidth = 1.2
  for (let i = 0; i < peaks.length; i++) {
    const x = (i / peaks.length) * width
    const amp = (peaks[i] ?? 0) * (mid - 2)
    const t = i / peaks.length
    ctx.strokeStyle = t <= played ? color : `${color}55`
    ctx.beginPath()
    ctx.moveTo(x, mid - amp)
    ctx.lineTo(x, mid + amp)
    ctx.stroke()
  }
}

export function encodeWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels
  const rate = buffer.sampleRate
  const length = buffer.length
  const bytes = length * channels * 2
  const header = 44
  const out = new ArrayBuffer(header + bytes)
  const view = new DataView(out)
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + bytes, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * channels * 2, true)
  view.setUint16(32, channels * 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, bytes, true)
  let offset = 44
  const chans: Float32Array[] = []
  for (let c = 0; c < channels; c++) chans.push(buffer.getChannelData(c))
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < channels; c++) {
      const sample = Math.max(-1, Math.min(1, chans[c]?.[i] ?? 0))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }
  return new Blob([out], { type: 'audio/wav' })
}
