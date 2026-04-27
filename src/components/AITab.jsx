import { useEffect, useRef, useState } from 'react'
import styles from './AITab.module.css'

export function AITab({ buttonLabel, onFetch, loading, messages, streaming, error, cached, onSend }) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  function handleSend() {
    const text = draft.trim()
    if (!text || loading) return
    setDraft('')
    onSend(text)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const md = (text) => text
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, m => `<ul>${m}</ul>`)
    .split('\n')
    .filter(l => l.trim())
    .map(l => l.startsWith('<') ? l : `<p>${l}</p>`)
    .join('')

  const hasContent = messages.length > 0 || streaming || loading

  return (
    <div className={styles.wrap}>
      <button className={styles.btn} onClick={onFetch} disabled={loading}>
        {loading && !hasContent ? <><Spinner /> elaborazione...</> : buttonLabel}
      </button>

      {error && <div className={styles.error}>{error}</div>}

      {cached && messages.length > 0 && !streaming && (
        <div className={styles.cachedBadge}>dalla cache · nessun token usato</div>
      )}

      {hasContent && (
        <div className={styles.chat}>
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? styles.userBubble : styles.modelBubble}>
              {m.role === 'model'
                ? <div dangerouslySetInnerHTML={{ __html: md(m.text) }} />
                : m.text
              }
            </div>
          ))}

          {streaming && (
            <div className={styles.modelBubble}>
              <div dangerouslySetInnerHTML={{ __html: md(streaming) }} />
            </div>
          )}

          {loading && !streaming && (
            <div className={styles.modelBubble}>
              <div className={styles.skeleton}><Spinner /> generazione in corso...</div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {messages.length > 0 && (
        <div className={styles.inputRow}>
          <input
            className={styles.chatInput}
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Chiedi qualcosa..."
            disabled={loading}
          />
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={loading || !draft.trim()}
          >
            ↑
          </button>
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <span className={styles.spinner}>
      <span/><span/><span/>
    </span>
  )
}
