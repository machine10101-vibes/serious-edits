import { useEffect, useRef } from 'react'
import { engine } from '../engine/studioEngine'
import { actions, useStudio } from '../store'

export function Stage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const clips = useStudio((s) => s.clips)
  const busy = useStudio((s) => s.busy)
  const aspect = useStudio((s) => s.project.aspect)

  useEffect(() => {
    engine.attachCanvas(canvasRef.current)
    return () => engine.attachCanvas(null)
  }, [])

  return (
    <section className="stage">
      <div className="stage-frame">
        <div className="stage-aspect" data-ratio={aspect}>
          <canvas ref={canvasRef} className="stage-canvas" />
          {clips.length === 0 && (
            <div className="stage-empty">
              <p className="serif">Start a mix</p>
              <p>Add a video and a song.</p>
              <div className="empty-actions">
                <label className="play" htmlFor="se-import-video">
                  Add video
                </label>
                <label className="chip" htmlFor="se-import-audio">
                  Add music
                </label>
                <button type="button" className="ghost" onClick={() => void actions.loadDemo()}>
                  Try a demo
                </button>
              </div>
            </div>
          )}
        </div>
        {busy && <div className="busy">{busy}</div>}
      </div>
    </section>
  )
}
