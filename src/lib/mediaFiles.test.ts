import { describe, expect, it } from 'vitest'
import { hasImportableFiles, mediaKindFromFile } from './mediaFiles'

describe('mediaKindFromFile', () => {
  it('classifies by mime and by extension when mime is empty', () => {
    expect(mediaKindFromFile({ name: 'hook.mp4', type: 'video/mp4' })).toBe('video')
    expect(mediaKindFromFile({ name: 'clip.mov', type: '' })).toBe('video')
    expect(mediaKindFromFile({ name: 'song.mp3', type: '' })).toBe('audio')
    expect(mediaKindFromFile({ name: 'pad.wav', type: 'audio/wav' })).toBe('audio')
    expect(mediaKindFromFile({ name: 'still.png', type: '' })).toBe('image')
    expect(mediaKindFromFile({ name: 'notes.txt', type: '' })).toBeNull()
  })

  it('accepts a dropped video even when the browser leaves type blank', () => {
    expect(hasImportableFiles([{ name: 'reel.mp4', type: '' }])).toBe(true)
    expect(hasImportableFiles([{ name: 'readme', type: '' }])).toBe(false)
  })
})
