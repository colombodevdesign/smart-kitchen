import { useState, useEffect, useCallback, useRef } from 'react'
import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore'
import { GoogleGenAI } from '@google/genai'
import { db } from '../firebase.js'
import { MODEL_PRO, PRO_CONFIG } from '../ai/model.js'
import { chatSystemPrompt } from '../ai/chat.js'
import { splitActions, visibleText } from '../ai/chatActions.js'
import { AIError, classifyError } from '../ai/errors.js'
import { getApiKey } from '../utils/apiKey.js'
import { todayStr } from '../utils/date.js'
import { buildUserContext, diffSnapshots } from '../utils/userContext.js'

const STORAGE_KEY = 'sk-chats'
// Chats kept (Firestore query and localStorage): today's plus the archive.
const MAX_CHATS = 30
// A chat stops growing here (oldest messages dropped): one doc must stay under 1 MB.
const MAX_MESSAGES = 200
// Messages sent back to the model as history.
const HISTORY = 30
const TITLE_LEN = 60

const ACTION_LABELS = {
  spesa: (a) => `aggiungere alla spesa ${a.items.map(i => i.name).join(', ')}`,
  pasto: (a) => `pianificare «${a.text}» il ${a.date}${a.time ? ` alle ${a.time}` : ''}`,
  rimuovi: (a) => `togliere dalla dispensa ${a.name}`,
  preferenza: (a) => `salvare la preferenza «${a.text}»`,
}
const STATUS_LABELS = { pending: 'in attesa', done: 'confermata', dismissed: 'rifiutata', missing: 'non trovata' }

function loadFromLocalStorage() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(raw) ? raw : []
  } catch { return [] }
}

function chatsRef(uid) {
  return collection(db, 'users', uid, 'chats')
}

function sortChats(list) {
  return [...list].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, MAX_CHATS)
}

// Archived at the end of its day, or earlier with "Nuova chat".
export function isArchived(chat, today = todayStr()) {
  return !!chat.archivedAt || chat.day < today
}

// What the model sees of a past message: the user's text with the changes that
// came with it, its own answers with the actions it proposed and how they went.
function apiContent(m) {
  if (m.role === 'user') {
    const text = m.changes?.length
      ? `[Cambiamenti dall’ultimo messaggio: ${m.changes.join('; ')}]\n${m.text}`
      : m.text
    return { role: 'user', parts: [{ text }] }
  }
  const actions = (m.actions ?? []).map(a => `${ACTION_LABELS[a.type]?.(a) ?? a.type} (${STATUS_LABELS[a.status] ?? a.status})`)
  const text = actions.length ? `${m.text}\n\n[Azioni proposte: ${actions.join('; ')}]` : m.text
  return { role: 'model', parts: [{ text: text || '…' }] }
}

// Free chat with the assistant. `getContextInputs()` returns what buildUserContext
// needs, read at the moment a message is sent (never the state of the first message).
export function useChat(uid, getContextInputs) {
  const [chats, setChats] = useState([])
  const chatsRef_ = useRef(chats)
  chatsRef_.current = chats
  const uidRef = useRef(uid)
  useEffect(() => { uidRef.current = uid }, [uid])

  const [streaming, setStreaming] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  // Bumped by every request and by stop(): a superseded stream stops updating state.
  const runRef = useRef(0)
  const partialRef = useRef(null)

  useEffect(() => {
    if (uid === undefined) return
    if (!uid) {
      setChats(sortChats(loadFromLocalStorage()))
      return
    }
    const q = query(chatsRef(uid), orderBy('updatedAt', 'desc'), limit(MAX_CHATS))
    // Local writes show up at once through the cache (latency compensation).
    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map(d => ({ ...d.data(), id: d.id })))
    }, console.error)
    return unsub
  }, [uid])

  useEffect(() => {
    if (uid || uid === undefined) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)) } catch {}
  }, [chats, uid])

  const write = useCallback((chat) => {
    const clean = { ...chat, messages: chat.messages.slice(-MAX_MESSAGES) }
    setChats(prev => sortChats([clean, ...prev.filter(c => c.id !== chat.id)]))
    chatsRef_.current = sortChats([clean, ...chatsRef_.current.filter(c => c.id !== chat.id)])
    if (uidRef.current) {
      const { id, ...data } = clean
      setDoc(doc(chatsRef(uidRef.current), id), data).catch(console.error)
    }
  }, [])

  const findChat = (id) => chatsRef_.current.find(c => c.id === id)

  const today = todayStr()
  const active = chats.find(c => !isArchived(c, today)) ?? null
  const archived = chats.filter(c => isArchived(c, today) && c.messages?.length)

  // Streams the answer to the last user message of `chatId`.
  const respond = useCallback(async (chatId, contextText) => {
    const run = ++runRef.current
    setLoading(true)
    setStreaming('')
    setError('')
    setErrorCode('')
    partialRef.current = { chatId, text: '' }
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new AIError('offline', 'Sei offline. Riprova quando torni online.')
      const apiKey = getApiKey()
      if (!apiKey) throw new AIError('no-key', 'API key non configurata. Impostala in Tu.')
      const chat = findChat(chatId)
      const contents = chat.messages.slice(-HISTORY).map(apiContent)
      // The history must open with the user.
      while (contents.length && contents[0].role !== 'user') contents.shift()
      const ai = new GoogleGenAI({ apiKey })
      const stream = await ai.models.generateContentStream({
        model: MODEL_PRO,
        contents,
        config: { ...PRO_CONFIG, systemInstruction: chatSystemPrompt(contextText) },
      })
      let full = ''
      for await (const chunk of stream) {
        if (runRef.current !== run) return
        const text = chunk.text
        if (!text) continue
        full += text
        partialRef.current = { chatId, text: full }
        setStreaming(visibleText(full))
      }
      if (runRef.current !== run) return
      const { text, actions } = splitActions(full)
      const latest = findChat(chatId)
      if (latest) {
        const msg = { id: `m${Date.now()}`, role: 'model', text, at: Date.now(), ...(actions.length ? { actions } : {}) }
        write({ ...latest, messages: [...latest.messages, msg], updatedAt: Date.now() })
      }
      setStreaming('')
    } catch (e) {
      if (runRef.current !== run) return
      const { code, message } = classifyError(e)
      setStreaming('')
      setError(message)
      setErrorCode(code)
    } finally {
      if (runRef.current === run) {
        setLoading(false)
        partialRef.current = null
      }
    }
  }, [write])

  const send = useCallback((rawText) => {
    const text = rawText.trim()
    if (!text || loading) return
    const now = new Date()
    const { text: contextText, snapshot } = buildUserContext({ ...getContextInputs(), now })
    const day = todayStr(now)
    const current = chatsRef_.current.find(c => !isArchived(c, day))
    const chat = current ?? { id: `c${now.getTime()}`, day, title: '', createdAt: now.getTime(), archivedAt: null, messages: [] }
    // The first message has no "before"; later ones say what changed since the previous one.
    const changes = current?.snapshot ? diffSnapshots(current.snapshot, snapshot, now) : []
    const msg = { id: `m${now.getTime()}`, role: 'user', text, at: now.getTime(), ...(changes.length ? { changes } : {}) }
    write({
      ...chat,
      title: chat.title || (text.length > TITLE_LEN ? `${text.slice(0, TITLE_LEN - 1)}…` : text),
      messages: [...chat.messages, msg],
      snapshot,
      updatedAt: now.getTime(),
    })
    respond(chat.id, contextText)
  }, [loading, getContextInputs, write, respond])

  // After an error: answer the last user message again, with fresh context.
  const retry = useCallback(() => {
    if (!active || loading) return
    const { text: contextText, snapshot } = buildUserContext({ ...getContextInputs(), now: new Date() })
    write({ ...active, snapshot, updatedAt: Date.now() })
    respond(active.id, contextText)
  }, [active, loading, getContextInputs, write, respond])

  // Stops the answer; what had arrived stays in the chat.
  const stop = useCallback(() => {
    runRef.current++
    const partial = partialRef.current
    partialRef.current = null
    setLoading(false)
    setStreaming('')
    if (!partial?.text) return
    const chat = findChat(partial.chatId)
    const { text } = splitActions(partial.text)
    if (chat && text) {
      write({ ...chat, messages: [...chat.messages, { id: `m${Date.now()}`, role: 'model', text, at: Date.now() }], updatedAt: Date.now() })
    }
  }, [write])

  const newChat = useCallback(() => {
    stop()
    setError('')
    setErrorCode('')
    const current = chatsRef_.current.find(c => !isArchived(c))
    if (current?.messages?.length) write({ ...current, archivedAt: Date.now(), updatedAt: Date.now() })
  }, [stop, write])

  const deleteChat = useCallback((id) => {
    setChats(prev => prev.filter(c => c.id !== id))
    chatsRef_.current = chatsRef_.current.filter(c => c.id !== id)
    if (uidRef.current) deleteDoc(doc(chatsRef(uidRef.current), id)).catch(console.error)
  }, [])

  // `patch` merges into action `index` of message `msgId` (status, undo data).
  const updateAction = useCallback((chatId, msgId, index, patch) => {
    const chat = findChat(chatId)
    if (!chat) return
    const messages = chat.messages.map(m => m.id !== msgId ? m : {
      ...m, actions: m.actions.map((a, i) => i === index ? { ...a, ...patch } : a),
    })
    write({ ...chat, messages })
  }, [write])

  return {
    active, archived, streaming, loading, error, errorCode,
    send, retry, stop, newChat, deleteChat, updateAction,
    restoreChat: write,
  }
}
