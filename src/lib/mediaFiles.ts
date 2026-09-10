export function mediaKindFromFile(file: { name: string; type: string }): 'audio' | 'video' | 'image' | null {
  const type = file.type.toLowerCase()
  const name = file.name
  if (type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac|aiff)$/i.test(name)) return 'audio'
  if (type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(name)) return 'video'
  if (type.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(name)) return 'image'
  return null
}

export function hasImportableFiles(files: ArrayLike<{ name: string; type: string }>): boolean {
  return Array.from(files).some((file) => mediaKindFromFile(file))
}
