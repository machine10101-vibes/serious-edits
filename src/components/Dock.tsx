import { actions, useStudio } from '../store'

export function Dock() {
  const panel = useStudio((s) => s.panel)
  const exportOpen = useStudio((s) => s.exportOpen)
  const items = [
    { id: 'library' as const, label: 'Media' },
    { id: 'mixer' as const, label: 'Mix' },
    { id: 'clip' as const, label: 'Clip' },
  ]

  return (
    <nav className="dock" aria-label="Studio panels">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={panel === item.id ? 'on' : ''}
          onClick={() => actions.togglePanel(item.id)}
        >
          {item.label}
        </button>
      ))}
      <button type="button" className={exportOpen ? 'on' : ''} onClick={actions.toggleExport}>
        Export
      </button>
    </nav>
  )
}
