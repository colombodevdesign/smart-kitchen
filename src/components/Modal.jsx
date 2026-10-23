import { useEffect, useId, useRef } from 'react'
import { Icon } from './ui/Icon.jsx'
import styles from './Modal.module.css'

// Open modals, innermost last: only the top one reacts to Escape/Tab, and the
// page scroll lock is released only when the last one closes.
const stack = []
let prevBodyOverflow = ''

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// `autoFocus={false}`: focus the dialog itself instead of its first field (no keyboard popping up on touch).
export function Modal({ open, onClose, title, children, footer, autoFocus = true }) {
  const id = useId()
  const titleId = `${id}-title`
  const dialogRef = useRef(null)
  const previouslyFocusedRef = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open) return
    previouslyFocusedRef.current = document.activeElement
    stack.push(id)
    if (stack.length === 1) {
      prevBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }

    const onKey = (e) => {
      if (stack[stack.length - 1] !== id) return
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key === 'Tab') {
        const nodes = dialogRef.current?.querySelectorAll(FOCUSABLE)
        if (!nodes || nodes.length === 0) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)

    // Skip auto-focus if an element inside the dialog (e.g. an autoFocus input) already has focus.
    if (!dialogRef.current?.contains(document.activeElement)) {
      const focusTarget = autoFocus
        ? dialogRef.current?.querySelector('input, textarea, select, [data-autofocus]') || dialogRef.current?.querySelector('button')
        : dialogRef.current
      focusTarget?.focus()
    }

    return () => {
      document.removeEventListener('keydown', onKey)
      const i = stack.lastIndexOf(id)
      if (i !== -1) stack.splice(i, 1)
      if (stack.length === 0) document.body.style.overflow = prevBodyOverflow
      const prev = previouslyFocusedRef.current
      if (prev && typeof prev.focus === 'function') prev.focus()
    }
  }, [open, id, autoFocus])

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby={title ? titleId : undefined}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <header className={styles.header}>
            <h3 id={titleId} className={styles.title}>{title}</h3>
            <button
              type="button"
              className={styles.close}
              onClick={onClose}
              aria-label="Chiudi"
            ><Icon name="close" size={18} /></button>
          </header>
        )}
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>
  )
}
