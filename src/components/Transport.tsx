import { formatBars, formatTimecode } from '../lib/time'
import { actions, useStudio } from '../store'
import { PauseIcon, PlayIcon, RazorIcon, StopIcon } from './Icons'
import { Meter } from './Meter'

export function Transport() {
  const time = useStudio((s) => s.time)
  const bpm = useStudio((s) => s.project.bpm)
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
          <button type="button" className="chip" onClick={() => actions.skip(-4)}>
            −Bar
          </button>
          <button type="button" className="chip" onClick={() => actions.skip(4)}>
            +Bar
          </button>
          <button type="button" className="chip" onClick={actions.loopIn}>
            In
          </button>
          <button type="button" className="chip" onClick={actions.loopOut}>
            Out
          </button>
          <button type="button" className="chip" onClick={actions.dropMarker}>
            Mark
          </button>
          <button type="button" className="chip" onClick={actions.splitAtPlayhead}>
            Split
          </button>
        </div>
      </div>
      <div className="timecode">
        <strong>{formatTimecode(time)}</strong>
        <em>
          {formatBars(time, bpm)} · {duration.toFixed(0)}s
        </em>
      </div>
      <div className="transport-right">
        <Meter vertical={false} />
        <label className="zoom">
          Zoom
          <input
            type="range"
            min={16}
            max={220}
            value={pps}
            onChange={(e) => actions.setZoom(Number(e.target.value))}
          />
        </label>
      </div>
    </footer>
  )
}
