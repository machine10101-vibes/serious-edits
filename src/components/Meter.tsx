import { useEffect, useRef } from 'react'
import { engine } from '../engine/studioEngine'

export function Meter({ vertical = true }: { vertical?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let raf = 0
    const tick = () => {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const dpr = window.devicePixelRatio || 1
        const w = canvas.clientWidth
        const h = canvas.clientHeight
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)
        const { peak, bass } = engine.getLevels()
        const level = Math.max(peak, bass * 0.8)
        const segs = vertical ? 18 : 24
        for (let i = 0; i < segs; i++) {
          const lit = i / segs < level
          const t = i / segs
          ctx.fillStyle = lit
            ? t > 0.85
              ? '#ff5a7a'
              : t > 0.65
                ? '#d4a657'
                : '#3ee0c5'
            : 'rgba(255,255,255,0.06)'
          if (vertical) {
            const bh = (h - (segs - 1) * 2) / segs
            ctx.fillRect(0, h - (i + 1) * (bh + 2), w, bh)
          } else {
            const bw = (w - (segs - 1) * 2) / segs
            ctx.fillRect(i * (bw + 2), 0, bw, h)
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [vertical])

  return <canvas ref={ref} className={vertical ? 'meter meter-v' : 'meter meter-h'} />
}
