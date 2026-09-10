import type { CSSProperties } from 'react'
import { engine } from '../engine/studioEngine'
import { drawWaveform } from '../lib/waveform'
import { actions, useStudio } from '../store'
import type { Deck } from '../types'
import { Knob } from './Knob'
import { PauseIcon, PlayIcon } from './Icons'
import { useEffect, useRef } from 'react'

export function DJBoard() {
  const a = useStudio((s) => s.deckA)
  const b = useStudio((s) => s.deckB)
  const xf = useStudio((s) => s.xfader)

  return (
    <section className="dj">
      <DeckPanel which="a" deck={a} accent="#d4a657" />
      <div className="dj-center">
        <p className="serif dj-title">Crossfader</p>
        <input
          className="xfader"
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={xf}
          onChange={(e) => actions.setXfader(Number(e.target.value))}
          aria-label="Crossfader"
        />
        <div className="xf-labels">
          <span>A</span>
          <span>Blend</span>
          <span>B</span>
        </div>
        <p className="hint">Load tracks from the library, cue, then ride the fader. Record captures the live mix.</p>
      </div>
      <DeckPanel which="b" deck={b} accent="#3ee0c5" />
    </section>
  )
}

function DeckPanel({ which, deck, accent }: { which: 'a' | 'b'; deck: Deck; accent: string }) {
  const assets = useStudio((s) => s.assets)
  const asset = assets.find((a) => a.id === deck.mediaId)
  const canvas = useRef<HTMLCanvasElement>(null)
  const duration = asset?.duration ?? 0
  const progress = duration ? deck.position / duration : 0

  useEffect(() => {
    if (canvas.current && asset?.peaks) drawWaveform(canvas.current, asset.peaks, accent, progress)
  }, [asset?.peaks, accent, progress])

  return (
    <article
      className="deck"
      style={{ ['--accent']: accent } as CSSProperties}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const id = e.dataTransfer.getData('text/media-id')
        if (id) actions.loadToDeck(which, id)
      }}
    >
      <header>
        <h3>Deck {which.toUpperCase()}</h3>
        <strong>{asset?.name ?? 'Empty'}</strong>
      </header>
      <canvas ref={canvas} className="deck-wave" />
      <div className="jog">
        <div className="jog-ring" style={{ transform: `rotate(${(deck.position * 40) % 360}deg)` }} />
        <button type="button" className="play" onClick={() => void actions.toggleDeck(which)}>
          {deck.playing ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>
      <div className="deck-controls">
        <Knob
          label="Rate"
          value={deck.rate}
          min={0.92}
          max={1.08}
          format={(v) => `${((v - 1) * 100).toFixed(1)}%`}
          onChange={(rate) => actions.updateDeck(which, { rate })}
        />
        <Knob
          label="Filter"
          value={deck.filter}
          min={-1}
          max={1}
          format={(v) => (Math.abs(v) < 0.04 ? 'FLAT' : v < 0 ? 'LP' : 'HP')}
          onChange={(filter) => actions.updateDeck(which, { filter })}
        />
        <Knob
          label="Vol"
          value={deck.volume}
          min={0}
          max={1.2}
          onChange={(volume) => actions.updateDeck(which, { volume })}
        />
      </div>
      <div className="eq-row">
        <Knob
          label="Lo"
          value={deck.eq.low}
          min={-12}
          max={12}
          size={40}
          format={(v) => v.toFixed(0)}
          onChange={(low) => actions.updateDeck(which, { eq: { ...deck.eq, low } })}
        />
        <Knob
          label="Mid"
          value={deck.eq.mid}
          min={-12}
          max={12}
          size={40}
          format={(v) => v.toFixed(0)}
          onChange={(mid) => actions.updateDeck(which, { eq: { ...deck.eq, mid } })}
        />
        <Knob
          label="Hi"
          value={deck.eq.high}
          min={-12}
          max={12}
          size={40}
          format={(v) => v.toFixed(0)}
          onChange={(high) => actions.updateDeck(which, { eq: { ...deck.eq, high } })}
        />
      </div>
      <div className="deck-buttons">
        <button type="button" className="chip" onClick={() => actions.syncDeck(which)}>
          Sync
        </button>
        <button type="button" className="chip" onClick={() => actions.jumpBeats(which, -1)}>
          −1
        </button>
        <button type="button" className="chip" onClick={() => actions.jumpBeats(which, 1)}>
          +1
        </button>
        <button type="button" className="chip" onClick={() => actions.setCue(which)}>
          Set Cue
        </button>
        <button type="button" className="chip" onClick={() => actions.cueDeck(which)}>
          Cue
        </button>
        <button
          type="button"
          className={deck.loop ? 'chip on' : 'chip'}
          onClick={() => actions.updateDeck(which, { loop: !deck.loop })}
        >
          Loop
        </button>
      </div>
      <div className="hotcues">
        {[0, 1, 2, 3].map((index) => (
          <button
            key={index}
            type="button"
            className={deck.hotCues[index] != null && deck.hotCues[index]! >= 0 ? 'chip on' : 'chip'}
            onClick={() => actions.jumpHotCue(which, index)}
            onContextMenu={(e) => {
              e.preventDefault()
              actions.setHotCue(which, index)
            }}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <input
        className="seek"
        type="range"
        min={0}
        max={Math.max(0.01, duration)}
        step={0.01}
        value={deck.position}
        onChange={(e) => {
          const position = Number(e.target.value)
          actions.updateDeck(which, { position })
          if (deck.playing) void engine.playDeck(which, { ...deck, position })
        }}
      />
    </article>
  )
}
