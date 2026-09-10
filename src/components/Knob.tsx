import type { CSSProperties, PointerEvent } from 'react'
import { clamp } from '../lib/mix'

interface KnobProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  label: string
  size?: number
  format?: (value: number) => string
}

export function Knob({ value, min, max, onChange, label, size = 48, format }: KnobProps) {
  const t = (value - min) / (max - min)
  const angle = -135 + t * 270

  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const startY = event.clientY
    const startVal = value
    const move = (ev: globalThis.PointerEvent) => {
      const delta = (startY - ev.clientY) / 90
      onChange(clamp(startVal + delta * (max - min), min, max))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const style = { width: size, height: size, ['--angle']: `${angle}deg` } as CSSProperties

  return (
    <label className="knob">
      <button type="button" className="knob-dial" style={style} onPointerDown={startDrag} aria-label={label}>
        <span className="knob-tick" />
      </button>
      <span className="knob-value">{format ? format(value) : value.toFixed(2)}</span>
      <span className="knob-label">{label}</span>
    </label>
  )
}
