import { useMemo, useState } from 'react'
import { actions, useStudio } from '../store'
import { ImportIcon } from './Icons'

export function Library() {
  const assets = useStudio((s) => s.assets)
  const selected = useStudio((s) => s.selectedMediaId)
  const [filter, setFilter] = useState<'all' | 'audio' | 'video' | 'visual'>('all')
  const shown = useMemo(
    () =>
      assets.filter((asset) => {
        if (filter === 'all') return true
        if (filter === 'video') return asset.kind === 'video' || asset.kind === 'image'
        return asset.kind === filter || (filter === 'visual' && asset.kind === 'visual')
      }),
    [assets, filter],
  )

  return (
    <aside className="library">
      <div className="panel-head">
        <h2>Library</h2>
        <button type="button" className="sheet-close" onClick={() => actions.setPanel(null)}>
          Done
        </button>
        <button type="button" className="icon-btn" onClick={() => actions.openImporter('any')} title="Import media">
          <ImportIcon />
        </button>
      </div>
      <div className="import-row">
        <button type="button" className="chip" onClick={() => actions.openImporter('video')}>
          Video
        </button>
        <button type="button" className="chip" onClick={() => actions.openImporter('audio')}>
          Music
        </button>
      </div>
      <div className="filters">
        {(['all', 'audio', 'video', 'visual'] as const).map((id) => (
          <button key={id} type="button" className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>
            {id}
          </button>
        ))}
      </div>
      <div className="asset-list">
        {shown.map((asset) => (
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
      <p className="hint">Import a video, then a song. Tap + to drop at the playhead. Drag on desktop.</p>
    </aside>
  )
}
