import { useEffect, useRef } from 'react'
import { engine } from '../engine/studioEngine'
import { actions, useStudio } from '../store'

export function Stage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const clips = useStudio((s) => s.clips)
  const busy = useStudio((s) => s.busy)
  const name = useStudio((s) => s.project.name)

  useEffect(() => {
    engine.attachCanvas(canvasRef.current)
    return () => engine.attachCanvas(null)
  }, [])

  return (
    <section className="stage">
      <div className="stage-frame">
        <canvas ref={canvasRef} className="stage-canvas" />
        {clips.length === 0 && (
          <div className="stage-empty">
            <p className="serif">The booth is yours.</p>
            <p>Import audio and video, or load the demo session to mix a full night in seconds.</p>
            <div className="empty-actions">
              <button type="button" className="play" onClick={() => void actions.loadDemo()}>
                Load demo session
              </button>
            </div>
          </div>
        )}
        {busy && <div className="busy">{busy}</div>}
      </div>
      <div className="stage-caption">
        <span>{name}</span>
        <span>Program output</span>
      </div>
    </section>
  )
}
