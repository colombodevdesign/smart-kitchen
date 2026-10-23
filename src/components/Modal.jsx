import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './ui/Icon.jsx'
import styles from './Modal.module.css'

// Open modals, innermost last: only the top one reacts to Escape/Tab, and the
// page scroll lock is released only when the last one closes.
const stack = []
let prevBodyOverflow = ''

// Keep in sync with the exit animation in Modal.module.css.
const EXIT_MS = 240
// The on-screen keyboard counts as open when it takes more than this off the viewport.
const KEYBOARD_MIN_PX = 120

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// `autoFocus={false}`: focus the dialog itself instead of its first field (no keyboard popping up on touch).
export function Modal({ open, onClose, title, children, footer, autoFocus = true }) {
  const id = useId()
  const titleId = `${id}-title`
  const dialogRef = useRef(null)
  const overlayRef = useRef(null)
  const previouslyFocusedRef = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  // Stay mounted while the exit animation plays.
  const [present, setPresent] = useState(open)
  useEffect(() => {
    if (open) { setPresent(true); return }
    const t = setTimeout(() => setPresent(false), EXIT_MS)
    return () => clearTimeout(t)
  }, [open])

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

    // iOS doesn't resize the page for the keyboard, it covers it. Follow the visual
    // viewport instead, so the sheet sits above the keyboard and scrolls inside.
    const vv = window.visualViewport
    let keyboardUp = false
    const syncViewport = () => {
      const overlay = overlayRef.current
      if (!overlay || !vv) return
      const up = vv.scale <= 1.01 && window.innerHeight - vv.height > KEYBOARD_MIN_PX
      if (up) {
        overlay.style.setProperty('--vv-top', `${vv.offsetTop}px`)
        overlay.style.setProperty('--vv-h', `${vv.height}px`)
        overlay.dataset.keyboard = 'true'
        // The field being typed in must not end up under the keyboard.
        if (!keyboardUp) {
          const el = document.activeElement
          if (el && dialogRef.current?.contains(el)) el.scrollIntoView({ block: 'nearest' })
        }
      } else {
        overlay.style.removeProperty('--vv-top')
        overlay.style.removeProperty('--vv-h')
        delete overlay.dataset.keyboard
      }
      keyboardUp = up
    }
    vv?.addEventListener('resize', syncViewport)
    vv?.addEventListener('scroll', syncViewport)
    syncViewport()

    return () => {
      vv?.removeEventListener('resize', syncViewport)
      vv?.removeEventListener('scroll', syncViewport)
      document.removeEventListener('keydown', onKey)
      const i = stack.lastIndexOf(id)
      if (i !== -1) stack.splice(i, 1)
      if (stack.length === 0) document.body.style.overflow = prevBodyOverflow
      const prev = previouslyFocusedRef.current
      if (prev && typeof prev.focus === 'function') prev.focus()
    }
  }, [open, id, autoFocus])

  // `present` lags `open` by the exit animation; on opening the dialog must exist in the same render (focus).
  if (!open && !present) return null

  return (
    <div ref={overlayRef} className={styles.overlay} data-closing={open ? undefined : 'true'} onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal={open ? 'true' : undefined}
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
