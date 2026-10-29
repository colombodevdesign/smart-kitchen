import { useEffect, useRef } from 'react'
import { Modal } from './Modal.jsx'
import { ChatView } from './ChatView.jsx'
import styles from './ChatAssistant.module.css'

const coarse = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

// The assistant chat. Mobile/tablet: a full-screen sheet (Modal follows the iOS
// keyboard). Desktop: a side panel on the right, not modal, so the page stays
// usable while chatting; Esc closes it while the focus is inside.
export function ChatAssistant({ open, isDesktop, onClose, ...viewProps }) {
  if (!isDesktop) {
    return (
      <Modal open={open} onClose={onClose} label="Assistente" fullscreen autoFocus={!coarse()}>
        {open && <ChatView {...viewProps} onClose={onClose} autoFocus={false} />}
      </Modal>
    )
  }
  return open ? <ChatPanel onClose={onClose} {...viewProps} /> : null
}

function ChatPanel({ onClose, ...viewProps }) {
  const ref = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const prev = document.activeElement
    const onKey = (e) => {
      if (e.key !== 'Escape' || !ref.current?.contains(document.activeElement)) return
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
      e.stopPropagation()
      onCloseRef.current()
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      if (prev && document.contains(prev) && ref.current?.contains(document.activeElement)) prev.focus?.()
    }
  }, [])

  return (
    <aside ref={ref} className={styles.panel} aria-label="Assistente" data-chat-panel>
      <ChatView {...viewProps} onClose={onClose} autoFocus />
    </aside>
  )
}
