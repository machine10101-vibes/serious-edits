import { ASPECTS, LOOKS } from '../types'
import { actions, useStudio } from '../store'

export function PictureBar() {
  const aspect = useStudio((s) => s.project.aspect)
  const look = useStudio((s) => s.project.look)
  const reactive = useStudio((s) => s.project.reactive)
  const subtitle = useStudio((s) => s.project.subtitle)
  const metronome = useStudio((s) => s.project.metronome)
  const follow = useStudio((s) => s.follow)
  const pictureAudio = useStudio((s) => {
    const videoIds = new Set(s.tracks.filter((track) => track.kind === 'video').map((track) => track.id))
    return s.clips.some((clip) => videoIds.has(clip.trackId) && clip.audioEnabled)
  })

  return (
    <div className="picture-bar">
      <div className="seg">
        {ASPECTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={aspect === item.id ? 'on' : ''}
            onClick={() => actions.setAspect(item.id)}
          >
            {item.id}
          </button>
        ))}
      </div>
      <button type="button" className="chip" onClick={actions.fitPictureToMix}>
        Fit
      </button>
      <div className="seg">
        {LOOKS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={look === item.id ? 'on' : ''}
            onClick={() => actions.setLook(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="phone-hide">
        <button type="button" className={reactive ? 'chip on' : 'chip'} onClick={actions.toggleReactive}>
          Beat
        </button>
        <button type="button" className={metronome ? 'chip on' : 'chip'} onClick={actions.toggleMetronome}>
          Click
        </button>
        <button type="button" className={follow ? 'chip on' : 'chip'} onClick={actions.toggleFollow}>
          Follow
        </button>
        <button type="button" className="chip" onClick={actions.scorePicture}>
          Score
        </button>
        <button type="button" className="chip" onClick={actions.autoFade}>
          Auto-fade
        </button>
        <button
          type="button"
          className={pictureAudio ? 'chip on' : 'chip'}
          onClick={() => actions.setPictureAudio(!pictureAudio)}
        >
          Vid audio
        </button>
        <label className="lyric">
          Lower third
          <input
            value={subtitle}
            placeholder="Artist — Track"
            onChange={(e) => actions.setSubtitle(e.target.value)}
          />
        </label>
      </div>
    </div>
  )
}
