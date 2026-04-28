import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './AITab.module.css'

export function AITab({ buttonLabel, onFetch, loading, messages, streaming, error, cached, onSend, parseForSave, onSaveItems }) {
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
  const lastModelText = messages.filter(m => m.role === 'model').map(m => m.text).join('\n\n')
  const showSavePanel = parseForSave && onSaveItems && lastModelText && !streaming && !loading

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

      {showSavePanel && (
        <SavePanel
          text={lastModelText}
          parseItems={parseForSave}
          onSave={onSaveItems}
        />
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

function SavePanel({ text, parseItems, onSave }) {
  const items = useMemo(() => parseItems(text), [text, parseItems])
  const [selected, setSelected] = useState(() => new Set(items.map(i => i.key)))
  const [open, setOpen] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    setSelected(new Set(items.map(i => i.key)))
    setSavedMsg('')
  }, [text, items])

  if (items.length === 0) return null

  function toggle(key) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function doSave(toSave) {
    if (toSave.length === 0) return
    onSave(toSave)
    setSavedMsg(`✓ ${toSave.length} element${toSave.length === 1 ? 'o salvato' : 'i salvati'}`)
    setTimeout(() => setSavedMsg(''), 2500)
  }

  return (
    <div className={styles.savePanel}>
      <button className={styles.savePanelToggle} onClick={() => setOpen(o => !o)}>
        <span>Salva in libreria</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className={styles.savePanelBody}>
          <ul className={styles.saveList}>
            {items.map(item => (
              <li key={item.key} className={styles.saveListItem}>
                <label className={styles.saveLabel}>
                  <input
                    type="checkbox"
                    checked={selected.has(item.key)}
                    onChange={() => toggle(item.key)}
                    className={styles.saveCheckbox}
                  />
                  <span>{item.label}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className={styles.saveActions}>
            {savedMsg ? (
              <span className={styles.savedConfirm}>{savedMsg}</span>
            ) : (
              <>
                <button className={styles.saveAllBtn} onClick={() => doSave(items.map(i => i.data))}>
                  Salva tutto
                </button>
                <button
                  className={styles.saveSelBtn}
                  onClick={() => doSave(items.filter(i => selected.has(i.key)).map(i => i.data))}
                  disabled={selected.size === 0}
                >
                  Salva selezionati ({selected.size})
                </button>
              </>
            )}
          </div>
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
