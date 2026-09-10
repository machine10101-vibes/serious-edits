import { actions, useStudio } from '../store'

export function Dock() {
  const panel = useStudio((s) => s.panel)
  const mode = useStudio((s) => s.mode)
  const items = [
    { id: 'library' as const, label: 'Library' },
    { id: 'mixer' as const, label: 'Mixer' },
    { id: 'clip' as const, label: 'Clip' },
    ...(mode === 'studio' ? [{ id: 'timeline' as const, label: 'Arrange' }] : []),
  ]

  return (
    <nav className="dock" aria-label="Studio panels">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={panel === item.id ? 'on' : ''}
          onClick={() => actions.setPanel(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
