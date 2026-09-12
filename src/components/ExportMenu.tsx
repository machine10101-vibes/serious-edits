import { actions, useStudio } from '../store'

export function ExportMenu() {
  const open = useStudio((s) => s.exportOpen)
  const busy = useStudio((s) => s.busy)
  const exporting = useStudio((s) => s.exporting)
  const aspect = useStudio((s) => s.project.aspect)
  const loop = useStudio((s) => s.loop)
  if (!open) return null

  return (
    <div className="help-scrim" onClick={actions.toggleExport}>
      <div className="help-card export-card" onClick={(e) => e.stopPropagation()}>
        <h2>Export</h2>
        <p>Download the picture mix or the audio.</p>
        <div className="export-grid">
          <button type="button" className="play" disabled={Boolean(exporting)} onClick={() => void actions.exportVideo()}>
            MP4
            <span>Video · {aspect}{loop ? ' · loop' : ''}</span>
          </button>
          <button type="button" className="chip" disabled={Boolean(exporting)} onClick={() => void actions.exportMp3()}>
            MP3
            <span>Audio</span>
          </button>
          <button type="button" className="chip" disabled={Boolean(exporting)} onClick={() => void actions.exportWav()}>
            WAV
            <span>Audio</span>
          </button>
          <button type="button" className="chip" onClick={actions.exportProject}>
            JSON
            <span>Project</span>
          </button>
        </div>
        {busy && <p className="hint">{busy}</p>}
        <button type="button" className="ghost" onClick={actions.toggleExport}>
          Close
        </button>
      </div>
    </div>
  )
}
