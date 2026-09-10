import type { AspectRatio, Clip, LookId, MediaAsset } from '../types'
import { clipEnd } from './clips'

export function aspectPair(ratio: AspectRatio): [number, number] {
  if (ratio === '9:16') return [9, 16]
  if (ratio === '1:1') return [1, 1]
  return [16, 9]
}

export function applyLook(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  look: LookId,
  time: number,
): void {
  if (look === 'clean') return
  ctx.save()
  if (look === 'noir') {
    ctx.globalCompositeOperation = 'saturation'
    ctx.fillStyle = '#888'
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'overlay'
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.fillRect(0, 0, w, h)
  } else if (look === 'cinematic') {
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, 'rgba(20, 70, 90, 0.18)')
    g.addColorStop(1, 'rgba(160, 70, 20, 0.16)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    vignette(ctx, w, h, 0.45)
  } else if (look === 'neon') {
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = 'rgba(90, 20, 140, 0.16)'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(0, 220, 200, 0.08)'
    ctx.fillRect(0, 0, w, h)
  } else if (look === 'sunset') {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.35, 20, w * 0.5, h * 0.4, w * 0.7)
    g.addColorStop(0, 'rgba(255, 160, 70, 0.2)')
    g.addColorStop(1, 'rgba(40, 10, 40, 0.25)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  } else if (look === 'vhs') {
    ctx.fillStyle = `rgba(0,255,80,${0.04 + (Math.sin(time * 18) + 1) * 0.015})`
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for (let y = (time * 40) % 6; y < h; y += 3) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    vignette(ctx, w, h, 0.5)
  }
  ctx.restore()
}

function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.7)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(0,0,0,${amount})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

export function drawLowerThird(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  text: string,
): void {
  if (!text.trim()) return
  const y = h * 0.78
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(0, y, w, h * 0.14)
  ctx.fillStyle = '#f0d29a'
  ctx.font = `600 ${Math.max(14, w * 0.028)}px Manrope, sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText(text, w * 0.06, y + h * 0.085)
}

export interface ScoredClip {
  mediaId: string
  start: number
  duration: number
}

export function scoreVisuals(
  visuals: MediaAsset[],
  duration: number,
  bpm: number,
): ScoredClip[] {
  const pool = visuals.filter((asset) => asset.kind === 'visual')
  if (!pool.length || duration <= 0) return []
  const bar = (4 * 60) / Math.max(1, bpm)
  const slice = bar * 2
  const out: ScoredClip[] = []
  let t = 0
  let i = 0
  while (t < duration - 0.05) {
    const asset = pool[i % pool.length]
    if (!asset) break
    const length = Math.min(slice, duration - t)
    out.push({ mediaId: asset.id, start: t, duration: length })
    t += length
    i += 1
  }
  return out
}

export function autoCrossfadeTrack(clips: Clip[], seconds: number): Clip[] {
  const ordered = [...clips].sort((a, b) => a.start - b.start)
  const fade = Math.max(0.05, seconds)
  return ordered.map((clip, index) => {
    const prev = ordered[index - 1]
    const next = ordered[index + 1]
    let start = clip.start
    let fadeIn = Math.min(clip.duration / 3, fade)
    let fadeOut = Math.min(clip.duration / 3, fade)
    if (prev) {
      start = Math.max(0, clipEnd(prev) - fade)
      fadeIn = fade
    }
    if (next) fadeOut = fade
    return { ...clip, start, fadeIn, fadeOut }
  })
}
