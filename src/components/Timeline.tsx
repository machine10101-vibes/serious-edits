import type { CSSProperties, PointerEvent, UIEvent } from 'react'
import { useRef } from 'react'
import { clipEnd } from '../lib/clips'
import { formatTimecode, timeToX, timelineWidth, xToTime } from '../lib/time'
import { actions, useStudio } from '../store'
import type { Clip, Track } from '../types'

export function Timeline() {
  const tracks = useStudio((s) => s.tracks)
  const clips = useStudio((s) => s.clips)
  const assets = useStudio((s) => s.assets)
  const pps = useStudio((s) => s.pixelsPerSecond)
  const time = useStudio((s) => s.time)
  const duration = useStudio((s) => s.project.duration)
  const selected = useStudio((s) => s.selectedClipId)
  const tool = useStudio((s) => s.tool)
  const bpm = useStudio((s) => s.project.bpm)
  const loop = useStudio((s) => s.loop)
  const loopStart = useStudio((s) => s.loopStart)
  const loopEnd = useStudio((s) => s.loopEnd)
  const scroller = useRef<HTMLDivElement>(null)
  const width = timelineWidth(duration, pps)
  const beats = Math.ceil((duration * bpm) / 60)

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    actions.setScroll(event.currentTarget.scrollLeft)
  }

  return (
    <section className="timeline">
      <div className="track-labels">
        <div className="ruler-spacer">Arrangement</div>
        {tracks.map((track) => (
          <TrackLabel key={track.id} track={track} />
        ))}
      </div>
      <div className="timeline-scroll" ref={scroller} onScroll={onScroll}>
        <div
          className="timeline-body"
          style={{ width }}
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault()
              actions.setZoom(pps + (e.deltaY < 0 ? 8 : -8))
            }
          }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('.clip')) return
            const rect = e.currentTarget.getBoundingClientRect()
            const t = xToTime(e.clientX - rect.left, pps, 0)
            actions.seek(t)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const mediaId = e.dataTransfer.getData('text/media-id')
            if (!mediaId) return
            const rect = e.currentTarget.getBoundingClientRect()
            const y = e.clientY - rect.top - 28
            const trackIndex = Math.max(0, Math.min(tracks.length - 1, Math.floor(y / 64)))
            const track = tracks[trackIndex]
            const t = xToTime(e.clientX - rect.left, pps, 0)
            actions.dropMediaOnTimeline(mediaId, track?.id ?? null, t)
          }}
        >
          <div className="ruler">
            {Array.from({ length: beats + 1 }, (_, i) => (
              <span key={i} className={i % 4 === 0 ? 'bar' : 'beat'} style={{ left: (i * 60) / bpm * pps }}>
                {i % 4 === 0 ? i / 4 + 1 : ''}
              </span>
            ))}
          </div>
          {loop && (
            <div
              className="loop-range"
              style={{ left: loopStart * pps, width: (loopEnd - loopStart) * pps }}
            />
          )}
          {tracks.map((track) => (
            <div key={track.id} className="lane" style={{ ['--lane']: track.color } as CSSProperties}>
              {clips
                .filter((clip) => clip.trackId === track.id)
                .map((clip) => {
                  const asset = assets.find((a) => a.id === clip.mediaId)
                  return (
                    <ClipView
                      key={clip.id}
                      clip={clip}
                      selected={selected === clip.id}
                      pps={pps}
                      color={asset?.color ?? track.color}
                      name={asset?.name ?? 'Clip'}
                      peaks={asset?.peaks}
                      tool={tool}
                    />
                  )
                })}
            </div>
          ))}
          <div className="playhead" style={{ transform: `translateX(${timeToX(time, pps, 0)}px)` }}>
            <span />
          </div>
        </div>
      </div>
    </section>
  )
}

function TrackLabel({ track }: { track: Track }) {
  return (
    <div className="track-label">
      <strong style={{ color: track.color }}>{track.name}</strong>
      <div>
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
  )
}

function ClipView({
  clip,
  selected,
  pps,
  color,
  name,
  peaks,
  tool,
}: {
  clip: Clip
  selected: boolean
  pps: number
  color: string
  name: string
  peaks?: number[]
  tool: 'pointer' | 'razor'
}) {
  const width = Math.max(12, clip.duration * pps)
  const left = clip.start * pps

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    actions.selectClip(clip.id)
    if (tool === 'razor') {
      const rect = (event.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
      const t = xToTime(event.clientX - rect.left, pps, 0)
      actions.splitClipAt(clip.id, t)
      return
    }
    const handle = (event.target as HTMLElement).dataset.edge
    const startX = event.clientX
    const origin = clip.start
    const end = clipEnd(clip)
    const move = (ev: globalThis.PointerEvent) => {
      const dt = (ev.clientX - startX) / pps
      if (handle === 'start') actions.trim(clip.id, 'start', origin + dt)
      else if (handle === 'end') actions.trim(clip.id, 'end', end + dt)
      else actions.moveClip(clip.id, origin + dt)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div
      className={selected ? 'clip on' : 'clip'}
      style={{ left, width, background: `${color}33`, borderColor: color }}
      onPointerDown={onPointerDown}
    >
      <span className="edge" data-edge="start" />
      <div className="clip-body">
        <span className="clip-name">{name}</span>
        {peaks && <MiniWave peaks={peaks} color={color} />}
        <span className="clip-time">{formatTimecode(clip.duration)}</span>
      </div>
      <span className="edge" data-edge="end" />
    </div>
  )
}

function MiniWave({ peaks, color }: { peaks: number[]; color: string }) {
  const pts = peaks.filter((_, i) => i % 8 === 0)
  return (
    <svg className="mini-wave" viewBox={`0 0 ${pts.length} 32`} preserveAspectRatio="none">
      {pts.map((p, i) => (
        <rect key={i} x={i} y={16 - p * 14} width="0.8" height={Math.max(1, p * 28)} fill={color} opacity="0.85" />
      ))}
    </svg>
  )
}
