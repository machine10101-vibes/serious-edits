import { actions, useStudio } from '../store'
import { Knob } from './Knob'
import { Meter } from './Meter'

export function Mixer() {
  const tracks = useStudio((s) => s.tracks)
  const selected = useStudio((s) => s.selectedTrackId)
  const master = useStudio((s) => s.master)

  return (
    <aside className="mixer">
      <div className="panel-head">
        <h2>Mixer</h2>
        <button type="button" className="sheet-close" onClick={() => actions.setPanel(null)}>
          Done
        </button>
        <div className="add-row">
          <button type="button" className="chip" onClick={() => actions.addTrack('audio')}>
            + Audio
          </button>
          <button type="button" className="chip" onClick={() => actions.addTrack('video')}>
            + Visual
          </button>
        </div>
      </div>
      <div className="strips">
        {tracks.map((track) => (
          <div
            key={track.id}
            className={selected === track.id ? 'strip on' : 'strip'}
            onClick={() => actions.selectTrack(track.id)}
          >
            <div className="strip-name" style={{ color: track.color }}>
              {track.name}
            </div>
            <div className="eq-row">
              <Knob
                label="Lo"
                value={track.eq.low}
                min={-12}
                max={12}
                size={36}
                format={(v) => `${v.toFixed(0)}`}
                onChange={(low) => actions.updateTrack(track.id, { eq: { ...track.eq, low } })}
              />
              <Knob
                label="Mid"
                value={track.eq.mid}
                min={-12}
                max={12}
                size={36}
                format={(v) => `${v.toFixed(0)}`}
                onChange={(mid) => actions.updateTrack(track.id, { eq: { ...track.eq, mid } })}
              />
              <Knob
                label="Hi"
                value={track.eq.high}
                min={-12}
                max={12}
                size={36}
                format={(v) => `${v.toFixed(0)}`}
                onChange={(high) => actions.updateTrack(track.id, { eq: { ...track.eq, high } })}
              />
            </div>
            <input
              className="pan"
              type="range"
              min={-1}
              max={1}
              step={0.01}
              value={track.pan}
              onChange={(e) => actions.updateTrack(track.id, { pan: Number(e.target.value) })}
              aria-label={`${track.name} pan`}
            />
            <div className="fader-row">
              <input
                className="fader"
                type="range"
                min={0}
                max={1.25}
                step={0.01}
                value={track.volume}
                onChange={(e) => actions.updateTrack(track.id, { volume: Number(e.target.value) })}
                aria-label={`${track.name} volume`}
              />
            </div>
            <div className="mute-row">
              <button
                type="button"
                className={track.muted ? 'mini on' : 'mini'}
                onClick={() => actions.updateTrack(track.id, { muted: !track.muted })}
              >
                M
              </button>
              <button
                type="button"
                className={track.solo ? 'mini solo' : 'mini'}
                onClick={() => actions.updateTrack(track.id, { solo: !track.solo })}
              >
                S
              </button>
            </div>
          </div>
        ))}
        <div className="strip master-strip">
          <div className="strip-name gold">Master</div>
          <Knob
            label="Filter"
            value={master.filter}
            min={-1}
            max={1}
            size={40}
            format={(v) => (Math.abs(v) < 0.04 ? 'FLAT' : v < 0 ? 'LP' : 'HP')}
            onChange={(filter) => actions.updateMaster('filter', filter)}
          />
          <Knob
            label="Verb"
            value={master.reverb}
            min={0}
            max={1}
            size={40}
            onChange={(reverb) => actions.updateMaster('reverb', reverb)}
          />
          <Knob
            label="Delay"
            value={master.delay}
            min={0}
            max={1}
            size={40}
            onChange={(delay) => actions.updateMaster('delay', delay)}
          />
          <Knob
            label="Drive"
            value={master.drive}
            min={0}
            max={1}
            size={40}
            onChange={(drive) => actions.updateMaster('drive', drive)}
          />
          <div className="fader-row">
            <input
              className="fader"
              type="range"
              min={0}
              max={1.2}
              step={0.01}
              value={master.volume}
              onChange={(e) => actions.updateMaster('volume', Number(e.target.value))}
              aria-label="Master volume"
            />
            <Meter />
          </div>
        </div>
      </div>
    </aside>
  )
}
