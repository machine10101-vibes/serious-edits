import { actions, useStudio } from '../store'
import { LoopIcon, PauseIcon, PlayIcon, RecordIcon, StopIcon } from './Icons'

export function TopBar() {
  const name = useStudio((s) => s.project.name)
  const bpm = useStudio((s) => s.project.bpm)
  const mode = useStudio((s) => s.mode)
  const snap = useStudio((s) => s.snap)
  const recording = useStudio((s) => s.recording)
  const playing = useStudio((s) => s.playing)
  const loop = useStudio((s) => s.loop)

  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark" />
        <div>
          <p className="logo">Serious Edits</p>
          <p className="tag">Mix · Cut · Perform</p>
        </div>
      </div>

      <input
        className="project-name"
        value={name}
        onChange={(e) => actions.rename(e.target.value)}
        aria-label="Project name"
      />

      <div className="modes">
        <button type="button" className={mode === 'studio' ? 'on' : ''} onClick={() => actions.setMode('studio')}>
          Studio
        </button>
        <button type="button" className={mode === 'dj' ? 'on' : ''} onClick={() => actions.setMode('dj')}>
          DJ
        </button>
      </div>

      <label className="bpm">
        <span>BPM</span>
        <input
          type="number"
          min={60}
          max={200}
          value={bpm}
          onChange={(e) => actions.setBpm(Number(e.target.value))}
        />
      </label>

      <button type="button" className={snap ? 'chip on' : 'chip'} onClick={actions.toggleSnap}>
        Snap
      </button>
      <button type="button" className={loop ? 'chip on' : 'chip'} onClick={actions.toggleLoop}>
        <LoopIcon /> Loop
      </button>

      <div className="top-actions">
        <button type="button" className="ghost" onClick={() => void actions.loadDemo()}>
          Demo
        </button>
        <button type="button" className="ghost" onClick={actions.newProject}>
          New
        </button>
        <button type="button" className="ghost" onClick={() => void actions.exportWav()}>
          WAV
        </button>
        <button type="button" className="ghost" onClick={actions.exportProject}>
          JSON
        </button>
        <button
          type="button"
          className={recording ? 'rec on' : 'rec'}
          onClick={() => void actions.toggleRecord()}
        >
          <RecordIcon />
          {recording ? 'Stop Rec' : 'Record'}
        </button>
        <button type="button" className="play" onClick={() => void actions.togglePlay()}>
          {playing ? <PauseIcon /> : <PlayIcon />}
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="ghost" onClick={actions.stop}>
          <StopIcon />
        </button>
      </div>
    </header>
  )
}