import type { ChangeEvent } from 'react'
import { actions } from '../store'

function onPick(event: ChangeEvent<HTMLInputElement>): void {
  if (event.target.files?.length) void actions.importFiles(event.target.files)
  event.target.value = ''
}

export function MediaInputs() {
  return (
    <div className="file-inputs">
      <input
        id="se-import-audio"
        className="file-input"
        type="file"
        multiple
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.aiff"
        onChange={onPick}
      />
      <input
        id="se-import-video"
        className="file-input"
        type="file"
        multiple
        accept="video/*,image/*,.mp4,.mov,.webm,.m4v,.png,.jpg,.jpeg,.webp"
        onChange={onPick}
      />
      <input
        id="se-import-any"
        className="file-input"
        type="file"
        multiple
        accept="audio/*,video/*,image/*,.mp3,.wav,.m4a,.mp4,.mov,.webm"
        onChange={onPick}
      />
    </div>
  )
}
