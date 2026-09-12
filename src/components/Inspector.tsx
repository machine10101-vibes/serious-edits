import { BLEND_MODES } from '../types'
import type { FitMode } from '../types'
import { actions, useStudio } from '../store'
import { Knob } from './Knob'

export function Inspector() {
  const clipId = useStudio((s) => s.selectedClipId)
  const clip = useStudio((s) => s.clips.find((c) => c.id === s.selectedClipId))
  const track = useStudio((s) => s.tracks.find((t) => t.id === s.selectedTrackId))
  const asset = useStudio((s) => s.assets.find((a) => a.id === s.clips.find((c) => c.id === s.selectedClipId)?.mediaId))

  if (!clip || !clipId) {
    return (
      <aside className="inspector is-empty">
        <div className="panel-head">
          <h2>Inspector</h2>
          <button type="button" className="sheet-close" onClick={() => actions.setPanel(null)}>
            Done
          </button>
        </div>
        <p className="hint">Select a clip, or drop a marker and score the picture to the beat.</p>
        <div className="inspect-actions">
          <button type="button" className="chip" onClick={actions.dropMarker}>
            Marker
          </button>
          <button type="button" className="chip" onClick={actions.scorePicture}>
            Score picture
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="inspector">
      <div className="panel-head">
        <h2>Inspector</h2>
        <span className="chip on">{asset?.name ?? 'Clip'}</span>
        <button type="button" className="sheet-close" onClick={() => actions.setPanel(null)}>
          Done
        </button>
      </div>
      <div className="inspect-grid">
        <Knob
          label="Gain"
          value={clip.gain}
          min={0}
          max={1.5}
          onChange={(gain) => actions.updateClip(clipId, { gain })}
        />
        <Knob
          label="Fade in"
          value={clip.fadeIn}
          min={0}
          max={4}
          format={(v) => `${v.toFixed(2)}s`}
          onChange={(fadeIn) => actions.updateClip(clipId, { fadeIn })}
        />
        <Knob
          label="Fade out"
          value={clip.fadeOut}
          min={0}
          max={4}
          format={(v) => `${v.toFixed(2)}s`}
          onChange={(fadeOut) => actions.updateClip(clipId, { fadeOut })}
        />
        <Knob
          label="Rate"
          value={clip.playbackRate}
          min={0.5}
          max={1.5}
          format={(v) => v.toFixed(2)}
          onChange={(playbackRate) => actions.updateClip(clipId, { playbackRate })}
        />
        <Knob
          label="Opacity"
          value={clip.opacity}
          min={0}
          max={1}
          onChange={(opacity) => actions.updateClip(clipId, { opacity })}
        />
        <Knob
          label="Scale"
          value={clip.scale}
          min={0.2}
          max={2.4}
          onChange={(scale) => actions.updateClip(clipId, { scale })}
        />
        <Knob
          label="Hue"
          value={clip.hue}
          min={0}
          max={360}
          format={(v) => `${v.toFixed(0)}°`}
          onChange={(hue) => actions.updateClip(clipId, { hue })}
        />
      </div>
      <label className="field">
        Title
        <input value={clip.text} onChange={(e) => actions.updateClip(clipId, { text: e.target.value })} />
      </label>
      <label className="field">
        Blend
        <select
          value={clip.blend}
          onChange={(e) => actions.updateClip(clipId, { blend: e.target.value as typeof clip.blend })}
        >
          {BLEND_MODES.map((mode) => (
            <option key={mode.id} value={mode.id}>
              {mode.label}
            </option>
          ))}
        </select>
      </label>
      {asset && asset.kind !== 'audio' && (
        <>
          <label className="field">
            Fit
            <select
              value={clip.fit}
              onChange={(e) => actions.updateClip(clipId, { fit: e.target.value as FitMode })}
            >
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
            </select>
          </label>
          <div className="inspect-actions">
            <button
              type="button"
              className={clip.audioEnabled ? 'chip on' : 'chip'}
              onClick={() => actions.updateClip(clipId, { audioEnabled: !clip.audioEnabled })}
            >
              Picture audio
            </button>
            <button
              type="button"
              className={clip.loop ? 'chip on' : 'chip'}
              onClick={() => actions.updateClip(clipId, { loop: !clip.loop })}
            >
              Loop
            </button>
            <button type="button" className="chip" onClick={actions.fitPictureToMix}>
              Fill mix
            </button>
          </div>
        </>
      )}
      {asset?.kind === 'audio' && (
        <div className="inspect-actions">
          <button
            type="button"
            className={clip.loop ? 'chip on' : 'chip'}
            onClick={() => actions.updateClip(clipId, { loop: !clip.loop })}
          >
            Loop clip
          </button>
        </div>
      )}
      {track && (
        <label className="field">
          Track filter
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={track.filter}
            onChange={(e) => actions.updateTrack(track.id, { filter: Number(e.target.value) })}
          />
        </label>
      )}
      <div className="inspect-actions">
        <button type="button" className="chip" onClick={actions.duplicateSelected}>
          Duplicate
        </button>
        <button type="button" className="chip danger" onClick={actions.deleteSelected}>
          Delete
        </button>
      </div>
    </aside>
  )
}
