import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './ui/Icon.jsx'
import { RecipeCard } from './ui/RecipeCard.jsx'
import { md } from '../utils/markdown.js'
import { parseRecipes } from '../utils/parsers.js'
import styles from './AITab.module.css'

// variant 'cards': recipes shown as one card each (messages are split on "## ").
// variant 'list':  plain chat bubbles, with a "save to library" panel.
export function AITab({
  variant = 'list', buttonLabel, hint, errorTitle, onFetch, loading, messages, streaming,
  error, errorCode, cached, onSend, parseForSave, onSaveItems, onGoApiKey,
}) {
  const [draft, setDraft] = useState('')
  const [savedKeys, setSavedKeys] = useState(() => new Set())
  const chatRef = useRef(null)

  // The bubble list scrolls inside its own box: follow new text only while the
  // reader is already at the bottom (never yank the view away).
  useEffect(() => {
    const el = chatRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (nearBottom) el.scrollTop = el.scrollHeight
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

  function saveRecipe(r) {
    onSaveItems?.([r.data])
    setSavedKeys(prev => new Set(prev).add(r.key))
  }

  const hasContent = messages.length > 0 || streaming || loading
  const lastModelText = messages.filter(m => m.role === 'model').map(m => m.text).join('\n\n')
  const showSavePanel = variant === 'list' && parseForSave && onSaveItems && lastModelText && !streaming && !loading
  const cards = variant === 'cards'

  const streamingRecipes = useMemo(() => (cards && streaming ? parseRecipes(streaming) : []), [cards, streaming])

  return (
    <div className={styles.wrap}>
      {hint && (
        <p className={styles.hint}><Icon name="sparkle" size={18} /> {hint}</p>
      )}

      <button className={styles.btn} onClick={onFetch} disabled={loading}>
        {loading && !hasContent ? <><Spinner /> elaborazione...</> : <><Icon name="sparkle" size={20} /> {buttonLabel}</>}
      </button>

      {error && (
        <section className={styles.errorCard} role="alert">
          <span className={styles.errorIcon}><Icon name={errorCode === 'offline' ? 'wifiOff' : 'alert'} size={26} /></span>
          <h3 className={styles.errorTitle}>{errorTitle ?? 'Non riesco a generare la risposta'}</h3>
          <p className={styles.errorText}>{error}</p>
          <div className={styles.errorActions}>
            {(errorCode === 'no-key' || errorCode === 'invalid-key') && onGoApiKey && (
              <button type="button" className={styles.errorPrimary} onClick={onGoApiKey}>Imposta la chiave API</button>
            )}
            <button type="button" className={styles.errorSecondary} onClick={onFetch} disabled={loading}>Riprova</button>
          </div>
        </section>
      )}

      {cached && messages.length > 0 && !streaming && (
        <div className={styles.cachedBadge}>dalla cache · nessun token usato</div>
      )}

      {hasContent && (
        <div
          ref={chatRef}
          className={`${styles.chat} ${cards ? styles.chatCards : ''}`}
          aria-live="polite"
          aria-busy={loading || !!streaming}
        >
          {messages.map((m, i) => {
            if (m.role === 'user') return <div key={i} className={styles.userBubble}>{m.text}</div>
            const recipes = cards ? parseRecipes(m.text) : []
            if (recipes.length > 0) {
              return recipes.map(r => (
                <RecipeCard
                  key={`${i}-${r.key}`}
                  recipe={r.data}
                  saved={savedKeys.has(r.key)}
                  onSave={onSaveItems ? () => saveRecipe(r) : undefined}
                />
              ))
            }
            return (
              <div key={i} className={styles.modelBubble}>
                <div dangerouslySetInnerHTML={{ __html: md(m.text) }} />
              </div>
            )
          })}

          {streaming && (cards && streamingRecipes.length > 0
            ? streamingRecipes.map((r, i) => (
                <RecipeCard key={r.key} recipe={r.data} streaming={i === streamingRecipes.length - 1} />
              ))
            : (
              <div className={styles.modelBubble}>
                <div dangerouslySetInnerHTML={{ __html: md(streaming) }} />
              </div>
            ))}

          {loading && !streaming && (
            <div className={styles.modelBubble}>
              <div className={styles.skeleton}><Spinner /> generazione in corso...</div>
            </div>
          )}
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
            placeholder={cards ? 'Chiedi una variante, es. senza forno' : 'Chiedi qualcosa...'}
            aria-label="Scrivi un messaggio"
            disabled={loading}
          />
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={loading || !draft.trim()}
            aria-label="Invia"
          >
            <Icon name="arrowRight" size={20} strokeWidth={2} />
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
    setSavedMsg(`${toSave.length} element${toSave.length === 1 ? 'o salvato' : 'i salvati'}`)
    setTimeout(() => setSavedMsg(''), 2500)
  }

  return (
    <div className={styles.savePanel}>
      <button className={styles.savePanelToggle} onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>Salva in libreria</span>
        <Icon name={open ? 'chevD' : 'chevR'} size={18} />
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
              <span className={styles.savedConfirm}><Icon name="check" size={16} strokeWidth={2.4} /> {savedMsg}</span>
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
