import { useEffect } from 'react'
import { DJBoard } from './components/DJBoard'
import { Inspector } from './components/Inspector'
import { Library } from './components/Library'
import { Mixer } from './components/Mixer'
import { Stage } from './components/Stage'
import { Timeline } from './components/Timeline'
import { TopBar } from './components/TopBar'
import { Transport } from './components/Transport'
import { actions, useStudio } from './store'

export function App() {
  const mode = useStudio((s) => s.mode)
  const toasts = useStudio((s) => s.toasts)

  useEffect(() => {
    actions.bindEngine()
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
      if (event.code === 'Space') {
        event.preventDefault()
        void actions.togglePlay()
      }
      if (event.key === 's' || event.key === 'S') actions.stop()
      if (event.key === 'r' || event.key === 'R') void actions.toggleRecord()
      if (event.key === 'l' || event.key === 'L') actions.toggleLoop()
      if (event.key === 'Delete' || event.key === 'Backspace') actions.deleteSelected()
      if ((event.metaKey || event.ctrlKey) && event.key === 'd') {
        event.preventDefault()
        actions.duplicateSelected()
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault()
        actions.splitAtPlayhead()
      }
      if (event.key === '1') void actions.toggleDeck('a')
      if (event.key === '2') void actions.toggleDeck('b')
    }
    const onDrop = (event: DragEvent) => {
      if (!event.dataTransfer?.files?.length) return
      if ([...event.dataTransfer.files].every((f) => f.type === '')) return
      event.preventDefault()
      void actions.importFiles(event.dataTransfer.files)
    }
    const prevent = (event: DragEvent) => {
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('drop', onDrop)
    window.addEventListener('dragover', prevent)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('dragover', prevent)
    }
  }, [])

  return (
    <div className="app">
      <div className="grain" />
      <TopBar />
      <div className="workspace">
        <Library />
        <div className="center-col">
          {mode === 'studio' ? <Stage /> : <DJBoard />}
          {mode === 'studio' && <Inspector />}
        </div>
        <Mixer />
      </div>
      {mode === 'studio' && <Timeline />}
      <Transport />
      <div className="toasts">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <strong>{toast.title}</strong>
            {toast.body && <span>{toast.body}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
