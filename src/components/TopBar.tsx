import { actions, useStudio } from '../store'
import { LoopIcon, RecordIcon } from './Icons'

export function TopBar() {
  const name = useStudio((s) => s.project.name)
  const bpm = useStudio((s) => s.project.bpm)
  const mode = useStudio((s) => s.mode)
  const snap = useStudio((s) => s.snap)
  const recording = useStudio((s) => s.recording)
  const loop = useStudio((s) => s.loop)

  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark" />
        <p className="logo">Serious Edits</p>
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

      <div className="top-actions">
        <details className="more-menu">
          <summary>More</summary>
          <div className="more-pop">
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
            <button type="button" className="chip" onClick={actions.tapTempo}>
              Tap
            </button>
            <button type="button" className={loop ? 'chip on' : 'chip'} onClick={actions.toggleLoop}>
              <LoopIcon /> Loop
            </button>
            <button type="button" className="ghost" onClick={actions.undo}>
              Undo
            </button>
            <button type="button" className="ghost" onClick={() => void actions.loadDemo()}>
              Demo
            </button>
            <button type="button" className="ghost" onClick={actions.newProject}>
              New
            </button>
            <label className="ghost" htmlFor="se-import-any">
              Import
            </label>
            <button
              type="button"
              className={recording ? 'rec on' : 'rec'}
              onClick={() => void actions.toggleRecord()}
            >
              <RecordIcon />
              {recording ? 'Stop rec' : 'Record'}
            </button>
            <button type="button" className="ghost" onClick={actions.toggleHelp}>
              Keys
            </button>
          </div>
        </details>
        <button type="button" className="export-btn" onClick={actions.toggleExport}>
          Export
        </button>
      </div>
    </header>
  )
}
