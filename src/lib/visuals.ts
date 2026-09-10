import type { VisualKind } from '../types'
import { lerp } from './mix'

export interface VisualFrame {
  kind: VisualKind
  time: number
  hue: number
  text: string
  bass: number
  mids: number
  highs: number
  spectrum: Uint8Array
  opacity: number
}

function hsl(h: number, s: number, l: number, a = 1): string {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`
}

function fillBg(ctx: CanvasRenderingContext2D, w: number, h: number, hue: number, t: number): void {
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, hsl(hue, 40, 6))
  g.addColorStop(0.5, hsl(hue + 30, 35, 8))
  g.addColorStop(1, hsl(hue + 80, 30, 5))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = `rgba(0,0,0,${0.15 + Math.sin(t * 0.4) * 0.05})`
  ctx.fillRect(0, 0, w, h)
}

export function drawVisual(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  frame: VisualFrame,
): void {
  ctx.save()
  ctx.globalAlpha *= frame.opacity
  switch (frame.kind) {
    case 'aurora':
      drawAurora(ctx, w, h, frame)
      break
    case 'pulse':
      drawPulse(ctx, w, h, frame)
      break
    case 'spectrum':
      drawSpectrum(ctx, w, h, frame)
      break
    case 'particles':
      drawParticles(ctx, w, h, frame)
      break
    case 'title':
      drawTitle(ctx, w, h, frame)
      break
    case 'strobe':
      drawStrobe(ctx, w, h, frame)
      break
    case 'tunnel':
      drawTunnel(ctx, w, h, frame)
      break
    case 'horizon':
      drawHorizon(ctx, w, h, frame)
      break
    case 'waveform':
      drawWaveformVisual(ctx, w, h, frame)
      break
  }
  ctx.restore()
}

function drawAurora(ctx: CanvasRenderingContext2D, w: number, h: number, f: VisualFrame): void {
  fillBg(ctx, w, h, f.hue, f.time)
  for (let i = 0; i < 6; i++) {
    ctx.beginPath()
    const y = h * (0.2 + i * 0.12)
    ctx.moveTo(0, y)
    for (let x = 0; x <= w; x += 8) {
      const wave =
        Math.sin(x * 0.008 + f.time * (0.6 + i * 0.15) + i) * 40 +
        Math.sin(x * 0.02 + f.time * 0.4) * 18 * (0.4 + f.bass)
      ctx.lineTo(x, y + wave)
    }
    ctx.strokeStyle = hsl(f.hue + i * 18, 70, 58, 0.28 + f.bass * 0.3)
    ctx.lineWidth = 18 - i * 2
    ctx.stroke()
  }
}

function drawPulse(ctx: CanvasRenderingContext2D, w: number, h: number, f: VisualFrame): void {
  fillBg(ctx, w, h, f.hue + 20, f.time)
  const cx = w / 2
  const cy = h / 2
  const rings = 7
  for (let i = 0; i < rings; i++) {
    const radius = (40 + i * 48 + f.time * 40 + f.bass * 80) % (Math.max(w, h) * 0.7)
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.strokeStyle = hsl(f.hue + i * 12, 80, 62, 0.18 + f.bass * 0.45)
    ctx.lineWidth = 3 + f.bass * 8
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(cx, cy, 16 + f.bass * 40, 0, Math.PI * 2)
  ctx.fillStyle = hsl(f.hue, 90, 70, 0.8)
  ctx.fill()
}

function drawSpectrum(ctx: CanvasRenderingContext2D, w: number, h: number, f: VisualFrame): void {
  fillBg(ctx, w, h, f.hue + 210, f.time)
  const bars = Math.min(96, f.spectrum.length)
  const gap = 2
  const bw = w / bars
  for (let i = 0; i < bars; i++) {
    const v = (f.spectrum[i] ?? 0) / 255
    const bh = Math.max(4, v * h * 0.82)
    const x = i * bw
    const g = ctx.createLinearGradient(0, h, 0, h - bh)
    g.addColorStop(0, hsl(f.hue, 70, 40, 0.2))
    g.addColorStop(1, hsl(f.hue + i, 90, 68, 0.95))
    ctx.fillStyle = g
    ctx.fillRect(x + gap / 2, h - bh, bw - gap, bh)
  }
}

const particleSeed: { x: number; y: number; s: number; v: number }[] = Array.from({ length: 90 }, (_, i) => ({
  x: (i * 97) % 1000,
  y: (i * 53) % 1000,
  s: 0.4 + (i % 7) * 0.15,
  v: 12 + (i % 11) * 4,
}))

function drawParticles(ctx: CanvasRenderingContext2D, w: number, h: number, f: VisualFrame): void {
  fillBg(ctx, w, h, f.hue + 10, f.time)
  for (const p of particleSeed) {
    const x = ((p.x + f.time * p.v * 8) % 1000) / 1000 * w
    const y = ((p.y + Math.sin(f.time * 0.7 + p.x) * 40) % 1000) / 1000 * h
    const r = p.s * (2 + f.bass * 10)
    ctx.fillStyle = hsl(f.hue + p.s * 40, 90, 66, 0.35 + f.bass * 0.5)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawTitle(ctx: CanvasRenderingContext2D, w: number, h: number, f: VisualFrame): void {
  fillBg(ctx, w, h, f.hue + 40, f.time)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(0, h * 0.32, w, h * 0.36)
  ctx.textAlign = 'center'
  ctx.fillStyle = hsl(f.hue + 30, 70, 82, 0.95)
  ctx.font = `600 ${Math.max(28, w * 0.055)}px Fraunces, serif`
  ctx.fillText(f.text || 'SERIOUS EDITS', w / 2, h * 0.52)
  ctx.font = `500 ${Math.max(12, w * 0.016)}px Manrope, sans-serif`
  ctx.fillStyle = hsl(f.hue, 30, 78, 0.7)
  ctx.fillText('MIX · CUT · PERFORM', w / 2, h * 0.6)
}

function drawStrobe(ctx: CanvasRenderingContext2D, w: number, h: number, f: VisualFrame): void {
  fillBg(ctx, w, h, f.hue + 320, f.time)
  const flash = f.bass > 0.55 ? 0.55 : 0.04
  ctx.fillStyle = hsl(f.hue, 80, 80, flash)
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = hsl(f.hue, 90, 70, 0.4 + f.bass)
  ctx.lineWidth = 10
  ctx.strokeRect(24, 24, w - 48, h - 48)
}

function drawTunnel(ctx: CanvasRenderingContext2D, w: number, h: number, f: VisualFrame): void {
  fillBg(ctx, w, h, f.hue + 180, f.time)
  const cx = w / 2
  const cy = h / 2
  for (let i = 18; i >= 0; i--) {
    const z = ((i + f.time * 2.4) % 18) / 18
    const size = lerp(w * 0.05, w * 1.2, z)
    ctx.strokeStyle = hsl(f.hue + i * 8, 70, 60, 0.12 + (1 - z) * 0.35)
    ctx.lineWidth = 2 + f.bass * 6
    ctx.strokeRect(cx - size / 2, cy - size * 0.32, size, size * 0.64)
  }
}

function drawHorizon(ctx: CanvasRenderingContext2D, w: number, h: number, f: VisualFrame): void {
  fillBg(ctx, w, h, f.hue + 200, f.time)
  const sunY = h * 0.42 - f.bass * 20
  const glow = ctx.createRadialGradient(w / 2, sunY, 10, w / 2, sunY, h * 0.5)
  glow.addColorStop(0, hsl(f.hue + 20, 90, 70, 0.9))
  glow.addColorStop(1, hsl(f.hue, 80, 20, 0))
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
  ctx.beginPath()
  ctx.arc(w / 2, sunY, 48 + f.bass * 30, 0, Math.PI * 2)
  ctx.fillStyle = hsl(f.hue + 10, 95, 72)
  ctx.fill()
  for (let i = 0; i < 18; i++) {
    const y = h * 0.5 + i * 14
    ctx.fillStyle = hsl(f.hue + 200, 40, 8 + i, 0.55)
    ctx.fillRect(0, y, w, 10)
    ctx.strokeStyle = hsl(f.hue, 80, 60, 0.12)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
}

function drawWaveformVisual(ctx: CanvasRenderingContext2D, w: number, h: number, f: VisualFrame): void {
  fillBg(ctx, w, h, f.hue + 28, f.time)
  const mid = h * 0.52
  const bars = Math.min(128, f.spectrum.length)
  const bw = w / bars
  ctx.fillStyle = hsl(f.hue, 20, 8, 0.35)
  ctx.fillRect(0, mid - 2, w, 4)
  for (let i = 0; i < bars; i++) {
    const v = (f.spectrum[i] ?? 0) / 255
    const amp = Math.max(6, (v * 0.72 + f.bass * 0.28) * h * 0.42)
    const x = i * bw
    const g = ctx.createLinearGradient(0, mid - amp, 0, mid + amp)
    g.addColorStop(0, hsl(f.hue + i * 0.4, 85, 68, 0.15))
    g.addColorStop(0.5, hsl(f.hue + 18, 90, 78, 0.95))
    g.addColorStop(1, hsl(f.hue + 40, 80, 50, 0.2))
    ctx.fillStyle = g
    ctx.fillRect(x + 1, mid - amp, Math.max(1, bw - 2), amp * 2)
  }
  ctx.textAlign = 'center'
  ctx.fillStyle = hsl(f.hue + 20, 40, 86, 0.7)
  ctx.font = `600 ${Math.max(14, w * 0.022)}px Manrope, sans-serif`
  if (f.text) ctx.fillText(f.text, w / 2, h * 0.14)
}
