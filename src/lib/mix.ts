export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function dbToGain(db: number): number {
  return 10 ** (db / 20)
}

export function gainToDb(gain: number): number {
  if (gain <= 0) return Number.NEGATIVE_INFINITY
  return 20 * Math.log10(gain)
}

export function equalPower(x: number): [number, number] {
  const t = clamp(x, 0, 1)
  return [Math.cos((t * Math.PI) / 2), Math.sin((t * Math.PI) / 2)]
}

export function linearCrossfade(x: number): [number, number] {
  const t = clamp(x, 0, 1)
  return [1 - t, t]
}

export function cutCrossfade(x: number): [number, number] {
  return x < 0.5 ? [1, 0] : [0, 1]
}

export function fadeGain(
  localTime: number,
  duration: number,
  fadeIn: number,
  fadeOut: number,
  gain: number,
): number {
  let g = gain
  if (fadeIn > 0 && localTime < fadeIn) {
    g *= clamp(localTime / fadeIn, 0, 1)
  }
  const remaining = duration - localTime
  if (fadeOut > 0 && remaining < fadeOut) {
    g *= clamp(remaining / fadeOut, 0, 1)
  }
  return Math.max(0, g)
}

export function eqGain(db: number): number {
  return dbToGain(clamp(db, -12, 12))
}

export function filterFromKnob(value: number): { type: BiquadFilterType; freq: number } | null {
  const v = clamp(value, -1, 1)
  if (Math.abs(v) < 0.04) return null
  if (v < 0) {
    return { type: 'lowpass', freq: lerp(18000, 180, -v) }
  }
  return { type: 'highpass', freq: lerp(40, 8000, v) }
}

export function normalizePeak(data: Float32Array, peak = 0.92): number {
  let max = 0
  for (const sample of data) max = Math.max(max, Math.abs(sample))
  if (max <= 0) return 0
  const gain = peak / max
  for (let i = 0; i < data.length; i++) data[i] *= gain
  return max
}

export function mixInto(
  dest: Float32Array,
  src: Float32Array,
  destOffset: number,
  gain: number,
): void {
  const start = Math.max(0, destOffset)
  for (let i = 0; i < src.length; i++) {
    const di = start + i
    if (di >= dest.length) break
    dest[di] += src[i] * gain
  }
}
