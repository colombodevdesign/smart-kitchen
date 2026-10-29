import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './ui/Icon.jsx'
import { RecipeCard } from './ui/RecipeCard.jsx'
import { ChatActionCard } from './ChatActionCard.jsx'
import { md } from '../utils/markdown.js'
import { parseRecipes } from '../utils/parsers.js'
import { todayStr } from '../utils/date.js'
import { AI_STUDIO_URL } from '../ai/errors.js'
import styles from './ChatView.module.css'

const SUGGESTIONS = [
  'Cosa cucino stasera con ciò che scade?',
  'Organizzami i pranzi di domani',
  'Cosa mi manca per una carbonara?',
]

function shiftDay(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return todayStr(d)
}

function longDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

// Archive groups, newest first: Oggi (archived by hand), Ieri, Questa settimana, Prima.
function archiveGroups(chats) {
  const today = todayStr()
  const yesterday = shiftDay(-1)
  const weekAgo = shiftDay(-7)
  const groups = [
    { id: 'oggi', label: 'Oggi', test: (d) => d === today },
    { id: 'ieri', label: 'Ieri', test: (d) => d === yesterday },
    { id: 'settimana', label: 'Questa settimana', test: (d) => d > weekAgo },
    { id: 'prima', label: 'Prima', test: () => true },
  ].map(g => ({ ...g, chats: [] }))
  for (const chat of chats) groups.find(g => g.test(chat.day)).chats.push(chat)
  return groups.filter(g => g.chats.length)
}

function chatMeta(chat, withDay) {
  const msgs = chat.messages ?? []
  const actions = msgs.flatMap(m => m.actions ?? [])
  const done = actions.filter(a => a.status === 'done')
  const prefs = done.filter(a => a.type === 'preferenza').length
  const others = done.length - prefs
  const parts = [
    withDay && longDay(chat.day),
    `${msgs.length} messaggi`,
    others && (others === 1 ? '1 azione' : `${others} azioni`),
    prefs && (prefs === 1 ? '1 preferenza salvata' : `${prefs} preferenze salvate`),
  ]
  return parts.filter(Boolean).join(' · ')
}

// Model text: an intro, then any recipes as cards (same format as Cucina › Ricette).
function ModelText({ text, savedTitles, onSaveRecipe, streaming = false }) {
  const recipes = useMemo(() => parseRecipes(text), [text])
  const at = text.search(/^## /m)
  const intro = recipes.length ? text.slice(0, at).trim() : text
  return (
    <>
      {intro && <div className={styles.modelText} dangerouslySetInnerHTML={{ __html: md(intro) }} />}
      {recipes.map((r, i) => (
        <RecipeCard
          key={r.key}
          recipe={r.data}
          streaming={streaming && i === recipes.length - 1}
          saved={savedTitles.has(r.data.title.toLowerCase())}
          onSave={onSaveRecipe ? () => onSaveRecipe(r.data) : undefined}
        />
      ))}
    </>
  )
}

function Messages({ chat, readOnly, mealPrefs, savedTitles, onSaveRecipe, onAction, onOpen }) {
  return chat.messages.map(m => (
    m.role === 'user' ? (
      <div key={m.id} className={styles.turn}>
        {m.changes?.length > 0 && (
          <div className={styles.changes} role="note">
            <Icon name="refresh" size={16} />
            <span><strong>Da allora</strong> · {m.changes.join(' · ')}</span>
          </div>
        )}
        <div className={styles.userBubble}>{m.text}</div>
      </div>
    ) : (
      <div key={m.id} className={styles.turn}>
        <ModelText text={m.text} savedTitles={savedTitles} onSaveRecipe={readOnly ? undefined : onSaveRecipe} />
        {(m.actions ?? []).map((a, i) => (
          <ChatActionCard
            key={i}
            action={a}
            mealPrefs={mealPrefs}
            readOnly={readOnly}
            onDecide={(decision) => onAction(m.id, i, a, decision)}
            onOpen={onOpen}
          />
        ))}
      </div>
    )
  ))
}

// The assistant: today's chat, the archive and archived chats (read only).
// Shared by the full-screen sheet (mobile/tablet) and the side panel (desktop).
export function ChatView({
  chat, archived, summary, mealPrefs, savedTitles, autoFocus,
  onClose, onSaveRecipe, onAction, onOpen, onGoApiKey, onDeleteChat,
}) {
  const [view, setView] = useState({ type: 'chat' })
  const [draft, setDraft] = useState('')
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const { active, streaming, loading, error, errorCode } = chat

  const viewing = view.type === 'archived' ? archived.find(c => c.id === view.id) : null
  // An archived chat that was deleted in the meantime: back to the list.
  useEffect(() => {
    if (view.type === 'archived' && !viewing) setView({ type: 'archive' })
  }, [view, viewing])

  // Follow new text only while the reader is already at the bottom; jump there on open.
  const shown = viewing ?? active
  const lastLen = shown?.messages?.length ?? 0
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [view, shown?.id])
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight
  }, [lastLen, streaming, loading, error])

  useEffect(() => {
    if (autoFocus && view.type === 'chat') inputRef.current?.focus()
  }, [autoFocus, view.type])

  function send(text) {
    if (!text.trim() || loading) return
    setDraft('')
    chat.send(text)
  }

  const latestArchived = archived[0]
  const recent = latestArchived && (latestArchived.day === todayStr() ? 'di prima' : latestArchived.day === shiftDay(-1) ? 'di ieri' : null)

  let head
  if (view.type === 'archive') {
    head = (
      <>
        <button type="button" className={styles.iconBtn} onClick={() => setView({ type: 'chat' })} aria-label="Torna alla chat di oggi">
          <Icon name="chevL" size={22} />
        </button>
        <h2 className={styles.title}>Archivio chat</h2>
      </>
    )
  } else if (viewing) {
    head = (
      <>
        <button type="button" className={styles.iconBtn} onClick={() => setView({ type: 'archive' })} aria-label="Torna all’archivio">
          <Icon name="chevL" size={22} />
        </button>
        <div className={styles.titleWrap}>
          <h2 className={styles.title}>{viewing.title || 'Chat'}</h2>
          <div className={styles.subtitle}>{longDay(viewing.day)} · archiviata</div>
        </div>
        <button type="button" className={styles.iconBtn} onClick={() => onDeleteChat(viewing)} aria-label="Elimina questa chat">
          <Icon name="trash" size={20} />
        </button>
      </>
    )
  } else {
    head = (
      <>
        <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Chiudi la chat">
          <Icon name="close" size={22} />
        </button>
        <span className={styles.avatar} aria-hidden="true"><Icon name="sparkle" size={18} /></span>
        <div className={styles.titleWrap}>
          <h2 className={styles.title}>Assistente</h2>
          <div className={styles.subtitle}>
            {active ? 'Oggi · si archivia stasera' : new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        {active && (
          <button type="button" className={styles.iconBtn} onClick={chat.newChat} aria-label="Nuova chat (archivia questa)">
            <Icon name="compose" size={20} />
          </button>
        )}
        <button type="button" className={styles.iconBtn} onClick={() => setView({ type: 'archive' })} aria-label="Archivio delle chat">
          <Icon name="archive" size={20} />
        </button>
      </>
    )
  }

  return (
    <div className={styles.view}>
      <header className={styles.head}>{head}</header>

      <div ref={scrollRef} className={styles.scroll} aria-live={view.type === 'chat' ? 'polite' : undefined} aria-busy={loading || undefined}>
        {view.type === 'archive' ? (
          <div className={styles.archive}>
            <p className={styles.archiveIntro}>Ogni sera la chat del giorno finisce qui da sola. Le preferenze e le azioni confermate restano nell’app.</p>
            {archived.length === 0 && <p className={styles.archiveEmpty}>Nessuna chat archiviata.</p>}
            {archiveGroups(archived).map(g => (
              <section key={g.id} className={styles.archiveGroup}>
                <h3 className={styles.groupLabel}>{g.label}</h3>
                <ul className={styles.archiveList}>
                  {g.chats.map(c => (
                    <li key={c.id}>
                      <button type="button" className={styles.archiveRow} onClick={() => setView({ type: 'archived', id: c.id })}>
                        <span className={styles.archiveText}>
                          <span className={styles.archiveTitle}>{c.title || 'Chat'}</span>
                          <span className={styles.archiveMeta}>{chatMeta(c, g.id === 'settimana' || g.id === 'prima')}</span>
                        </span>
                        <Icon name="chevR" size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : viewing ? (
          <div className={styles.thread}>
            <Messages chat={viewing} readOnly mealPrefs={mealPrefs} savedTitles={savedTitles} onAction={() => {}} onOpen={onOpen} />
          </div>
        ) : !active?.messages?.length && !loading ? (
          <div className={styles.empty}>
            {recent && (
              <button type="button" className={styles.archivedBanner} onClick={() => setView({ type: 'archived', id: latestArchived.id })}>
                <Icon name="archive" size={18} />
                <span>La chat {recent} è in Archivio</span>
                <strong>Apri</strong>
              </button>
            )}
            <div className={styles.hero}>
              <span className={styles.heroIcon} aria-hidden="true"><Icon name="sparkle" size={30} strokeWidth={1.6} /></span>
              <h3 className={styles.heroTitle}>Cosa cuciniamo?</h3>
              <p className={styles.heroText}>Conosco la tua dispensa, i pasti in programma e la lista della spesa. Se qualcosa cambia mentre parliamo, me ne accorgo.</p>
            </div>
            <ul className={styles.summary} aria-label="Cosa conosce l’assistente">
              <li>{summary.products === 1 ? '1 prodotto' : `${summary.products} prodotti`}</li>
              <li>{summary.planned === 1 ? '1 pasto in programma' : `${summary.planned} pasti in programma`}</li>
              <li>{summary.toBuy} in lista</li>
              <li>
                <button type="button" className={styles.summaryLink} onClick={() => onOpen('preferenze')}>
                  {summary.prefs === 1 ? '1 preferenza' : `${summary.prefs} preferenze`}
                </button>
              </li>
            </ul>
            <div className={styles.suggestions}>
              <h3 className={styles.groupLabel}>Prova a chiedere</h3>
              {SUGGESTIONS.map(s => (
                <button key={s} type="button" className={styles.suggestion} onClick={() => send(s)}>
                  <span>{s}</span>
                  <Icon name="arrowRight" size={18} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.thread}>
            {active && (
              <Messages
                chat={active}
                mealPrefs={mealPrefs}
                savedTitles={savedTitles}
                onSaveRecipe={onSaveRecipe}
                onAction={(msgId, i, a, decision) => onAction(active.id, msgId, i, a, decision)}
                onOpen={onOpen}
              />
            )}
            {loading && (
              <div className={styles.turn}>
                <div className={styles.live}><Icon name="sparkle" size={16} /> {streaming ? 'Sto scrivendo…' : 'Ci penso…'}</div>
                {streaming && <ModelText text={streaming} savedTitles={savedTitles} streaming />}
              </div>
            )}
            {error && (
              <section className={styles.errorCard} role="alert">
                <span className={styles.errorIcon}><Icon name={errorCode === 'offline' ? 'wifiOff' : 'alert'} size={24} /></span>
                <p className={styles.errorText}>{error}</p>
                <div className={styles.errorActions}>
                  {(errorCode === 'no-key' || errorCode === 'invalid-key') && (
                    <button type="button" className={styles.confirmBtn} onClick={onGoApiKey}>Imposta la chiave API</button>
                  )}
                  {errorCode === 'billing' && (
                    <a className={styles.confirmBtn} href={AI_STUDIO_URL} target="_blank" rel="noopener noreferrer">Apri AI Studio</a>
                  )}
                  <button type="button" className={styles.dismissBtn} onClick={chat.retry}>Riprova</button>
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {view.type === 'archive' ? (
        <div className={styles.composer}>
          <button type="button" className={styles.backToday} onClick={() => setView({ type: 'chat' })}>
            <Icon name="compose" size={20} /> Torna alla chat di oggi
          </button>
        </div>
      ) : !viewing && (
        <form className={styles.composer} onSubmit={(e) => { e.preventDefault(); send(draft) }}>
          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              className={styles.input}
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Scrivi un messaggio"
              aria-label="Scrivi all’assistente"
              enterKeyHint="send"
              disabled={loading}
            />
            {loading ? (
              <button type="button" className={`${styles.sendBtn} ${styles.stopBtn}`} onClick={chat.stop} aria-label="Ferma la risposta">
                <Icon name="stop" size={16} fill="currentColor" />
              </button>
            ) : (
              <button type="submit" className={styles.sendBtn} disabled={!draft.trim()} aria-label="Invia">
                <Icon name="arrowUp" size={20} strokeWidth={2} />
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
