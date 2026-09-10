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
        <h2>Export the mix</h2>
        <p>Bounce the timeline into a file you can post or send. Video uses the picture, looks, and live mix. Audio is a dry mixdown of faders, pans, and fades.</p>
        <div className="export-grid">
          <button type="button" className="play" disabled={Boolean(exporting)} onClick={() => void actions.exportVideo()}>
            Export MP4
            <span>Video · {aspect}{loop ? ' · loop region' : ''}</span>
          </button>
          <button type="button" className="chip" disabled={Boolean(exporting)} onClick={() => void actions.exportMp3()}>
            Export MP3
            <span>Audio mix</span>
          </button>
          <button type="button" className="chip" disabled={Boolean(exporting)} onClick={() => void actions.exportWav()}>
            Export WAV
            <span>Uncompressed</span>
          </button>
          <button type="button" className="chip" onClick={actions.exportProject}>
            Save JSON
            <span>Timeline only</span>
          </button>
        </div>
        {busy && <p className="hint">{busy}</p>}
        <p className="hint">MP4 needs Chrome, Edge, or Safari. Other browsers download WebM. Turn Loop on to export only the in/out region. Picture audio stays muted unless you turn it on.</p>
        <button type="button" className="ghost" onClick={actions.toggleExport}>
          Close
        </button>
      </div>
    </div>
  )
}
