import { clamp } from './mix'

export function secondsPerBeat(bpm: number): number {
  return 60 / Math.max(1, bpm)
}

export function snapTime(time: number, bpm: number, division = 4, enabled = true): number {
  if (!enabled) return Math.max(0, time)
  const grid = secondsPerBeat(bpm) / division
  return Math.max(0, Math.round(time / grid) * grid)
}

export function formatTimecode(seconds: number): string {
  const sign = seconds < 0 ? '-' : ''
  const total = Math.abs(seconds)
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  const ms = Math.floor((total % 1) * 1000)
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

export function formatBars(seconds: number, bpm: number): string {
  const beats = seconds / secondsPerBeat(bpm)
  const bar = Math.floor(beats / 4) + 1
  const beat = Math.floor(beats % 4) + 1
  return `${bar}.${beat}`
}

export function timelineWidth(duration: number, pps: number): number {
  return Math.max(800, duration * pps + 200)
}

export function xToTime(x: number, pps: number, scrollX: number): number {
  return Math.max(0, (x + scrollX) / pps)
}

export function timeToX(time: number, pps: number, scrollX: number): number {
  return time * pps - scrollX
}

export function clampZoom(pps: number): number {
  return clamp(pps, 16, 220)
}
