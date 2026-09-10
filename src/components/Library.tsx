import { useMemo, useRef, useState } from 'react'
import { actions, useStudio } from '../store'
import { ImportIcon } from './Icons'

export function Library() {
  const assets = useStudio((s) => s.assets)
  const selected = useStudio((s) => s.selectedMediaId)
  const [filter, setFilter] = useState<'all' | 'audio' | 'video' | 'visual'>('all')
  const input = useRef<HTMLInputElement>(null)
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
        <button type="button" className="icon-btn" onClick={() => input.current?.click()} title="Import media">
          <ImportIcon />
        </button>
        <input
          ref={input}
          type="file"
          hidden
          multiple
          accept="audio/*,video/*,image/*"
          onChange={(e) => {
            if (e.target.files) void actions.importFiles(e.target.files)
            e.target.value = ''
          }}
        />
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
      <p className="hint">Tap + to drop at the playhead. Drag on desktop. Drop files anywhere to import.</p>
    </aside>
  )
}
