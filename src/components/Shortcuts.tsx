import { actions, useStudio } from '../store'

const ROWS = [
  ['Space', 'Play / pause'],
  ['← →', 'Skip a beat'],
  ['Shift + arrows', 'Skip a bar'],
  ['M', 'Drop a marker'],
  ['Z / Y', 'Undo / redo'],
  ['L', 'Loop'],
  ['G', 'Metronome'],
  ['F', 'Follow playhead'],
  ['1 / 2', 'Deck A / B'],
  ['E', 'Export MP4 / MP3'],
  ['?', 'This guide'],
]

export function Shortcuts() {
  const open = useStudio((s) => s.help)
  if (!open) return null
  return (
    <div className="help-scrim" onClick={actions.toggleHelp}>
      <div className="help-card" onClick={(e) => e.stopPropagation()}>
        <h2>On the boards</h2>
        <p>Import video and music, mix, then export MP4 or MP3. Everything stays in this tab.</p>
        <ul>
          {ROWS.map(([key, label]) => (
            <li key={key}>
              <kbd>{key}</kbd>
              <span>{label}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="play" onClick={actions.toggleHelp}>
          Close
        </button>
      </div>
    </div>
  )
}
