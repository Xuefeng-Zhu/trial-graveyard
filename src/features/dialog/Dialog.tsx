import { useEffect, useId, useRef, type ReactNode } from 'react'
import styles from './dialog.module.css'

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const previous = document.activeElement
    const node = ref.current!
    if (node.showModal) node.showModal()
    else { node.setAttribute('open', ''); node.querySelector('button')?.focus() }
    return () => {
      if (node.close) node.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={ref} aria-labelledby={id} aria-modal="true" className={styles.dialog}
    onCancel={event => { event.preventDefault(); onClose() }}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab') return
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), summary')]
        .filter(node => !node.closest('[hidden]') && (!node.closest('details:not([open])') || node.tagName === 'SUMMARY'))
      const first = controls[0]
      const last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}>
    <header className={styles.title}><h2 id={id}>{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog">✕</button></header>
    {children}
  </dialog>
}
