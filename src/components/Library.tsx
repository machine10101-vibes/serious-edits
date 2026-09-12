import { actions, useStudio } from '../store'
import { ImportIcon } from './Icons'

export function Library() {
  const assets = useStudio((s) => s.assets)
  const selected = useStudio((s) => s.selectedMediaId)

  return (
    <aside className="library">
      <div className="panel-head">
        <h2>Media</h2>
        <button type="button" className="sheet-close" onClick={() => actions.setPanel(null)}>
          Done
        </button>
        <label className="icon-btn" htmlFor="se-import-any" title="Import media">
          <ImportIcon />
        </label>
      </div>
      <div className="import-row">
        <label className="chip" htmlFor="se-import-video">
          Video
        </label>
        <label className="chip" htmlFor="se-import-audio">
          Music
        </label>
      </div>
      <div className="asset-list">
        {assets.map((asset) => (
          <div key={asset.id} className={selected === asset.id ? 'asset-row on' : 'asset-row'}>
            <button
              type="button"
              className="asset"
              draggable
              onClick={() => actions.selectMedia(asset.id)}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/media-id', asset.id)
                e.dataTransfer.effectAllowed = 'copy'
              }}
              onDoubleClick={() => {
                if (asset.kind === 'audio') actions.loadToDeck('a', asset.id)
                else actions.dropMediaOnTimeline(asset.id, null, 0)
              }}
            >
              <span className="swatch" style={{ background: asset.color }} />
              <span className="asset-meta">
                <strong>{asset.name}</strong>
                <em>
                  {asset.kind} · {asset.duration.toFixed(1)}s
                </em>
              </span>
            </button>
            <button type="button" className="add-hit" onClick={() => actions.addAtPlayhead(asset.id)}>
              +
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
