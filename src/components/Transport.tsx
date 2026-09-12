import { formatTimecode } from '../lib/time'
import { actions, useStudio } from '../store'
import { PauseIcon, PlayIcon, RazorIcon, StopIcon } from './Icons'

export function Transport() {
  const time = useStudio((s) => s.time)
  const playing = useStudio((s) => s.playing)
  const pps = useStudio((s) => s.pixelsPerSecond)
  const tool = useStudio((s) => s.tool)
  const duration = useStudio((s) => s.project.duration)

  return (
    <footer className="transport">
      <div className="transport-left">
        <button type="button" className="play" onClick={() => void actions.togglePlay()} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button type="button" className="ghost" onClick={actions.stop} aria-label="Stop">
          <StopIcon />
        </button>
        <div className="phone-hide">
          <button
            type="button"
            className={tool === 'pointer' ? 'chip on' : 'chip'}
            onClick={() => actions.setTool('pointer')}
          >
            Move
          </button>
          <button
            type="button"
            className={tool === 'razor' ? 'chip on' : 'chip'}
            onClick={() => actions.setTool('razor')}
          >
            <RazorIcon /> Cut
          </button>
        </div>
      </div>
      <div className="timecode">
        <strong>{formatTimecode(time)}</strong>
        <em>{duration.toFixed(0)}s</em>
      </div>
      <label className="zoom phone-hide">
        Zoom
        <input
          type="range"
          min={16}
          max={220}
          value={pps}
          onChange={(e) => actions.setZoom(Number(e.target.value))}
        />
      </label>
    </footer>
  )
}
