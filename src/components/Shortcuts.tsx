import { actions, useStudio } from '../store'

const ROWS = [
  ['Space', 'Play / pause'],
  ['← →', 'Skip a beat'],
  ['Shift + arrows', 'Skip a bar'],
  ['E', 'Export'],
  ['L', 'Loop'],
  ['Z / Y', 'Undo / redo'],
  ['?', 'This guide'],
]

export function Shortcuts() {
  const open = useStudio((s) => s.help)
  if (!open) return null
  return (
    <div className="help-scrim" onClick={actions.toggleHelp}>
      <div className="help-card" onClick={(e) => e.stopPropagation()}>
        <h2>Keys</h2>
        <p>Add a video and a song, mix, then export.</p>
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
