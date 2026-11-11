import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, onSnapshot, runTransaction } from 'firebase/firestore'
import { db } from '../firebase.js'
import { applyOps, diffDoc, sameValue } from '../sync/docPatch.js'
import { queueKey, loadQueue, enqueue, dequeue } from '../sync/pendingQueue.js'

const RETRY_MS = [2000, 5000, 15000, 30000, 60000]
// A network that is up but not working (Wi-Fi without internet) can keep a
// transaction waiting: past this the batch is retried later. Should the first
// attempt still go through, replaying the same operations changes nothing.
const FLUSH_TIMEOUT_MS = 20000

function withTimeout(promise, ms) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'deadline-exceeded' })), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// A document of users/{uid}/… kept in sync without ever overwriting newer data.
//
//   const [data, update] = useSyncedDoc(uid, { path, normalize, keep, loadLocal, saveLocal })
//   update(prev => next)
//
// With an account, `update` does not write `next` as it is: it turns the change into
// operations on single entities and fields (sync/docPatch.js), stores them in a local
// queue (sync/pendingQueue.js) and applies them in a transaction to the version that
// is on the server at that moment. A copy that is old (opened from the offline cache,
// edited while the connection was down, a tab left open for days) can therefore no
// longer bring back old data: only what the user changed is written. Offline the
// operations wait in the queue, also across reloads, and are sent when the connection
// returns. What is shown is the last snapshot with the queued operations on top.
//
// Without an account (demo, logged out) the data stays in localStorage
// (loadLocal/saveLocal). `loadLocal` is also migrated to Firestore on the first login.
//
// path: segments after users/{uid}, e.g. ['inventory', 'data']
// normalize: raw document → shape used by the app (fills missing keys/fields)
// keep: list keys that always exist even when empty
export function useSyncedDoc(uid, options) {
  const opts = useRef(options)
  opts.current = options
  const pathKey = options.path.join('/')

  const [data, setData] = useState(() => options.normalize({}))
  const dataRef = useRef(data)
  const uidRef = useRef(uid)
  uidRef.current = uid
  const ctx = useRef(null)

  const show = useCallback((next) => {
    dataRef.current = next
    setData(next)
  }, [])

  const view = useCallback((c) => {
    const ops = loadQueue(c.key).flatMap(e => e.ops)
    return opts.current.normalize(applyOps(c.base ?? {}, ops, opts.current.keep))
  }, [])

  const flush = useCallback(async (c) => {
    if (!c.alive) return
    if (c.flushing) { c.again = true; return }
    const batch = loadQueue(c.key)
    if (batch.length === 0) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    c.flushing = true
    clearTimeout(c.timer)
    let ok = false
    try {
      const ops = batch.flatMap(e => e.ops)
      const keep = opts.current.keep
      await withTimeout(runTransaction(db, async (tx) => {
        const snap = await tx.get(c.ref)
        const current = snap.exists() ? snap.data() : {}
        const next = applyOps(current, ops, keep)
        if (!snap.exists() || !sameValue(current, next)) tx.set(c.ref, next)
      }), FLUSH_TIMEOUT_MS)
      dequeue(c.key, batch.map(e => e.id))
      c.attempt = 0
      ok = true
      if (c.alive) show(view(c))
    } catch (err) {
      if (err?.code === 'invalid-argument') {
        // The data itself is rejected: retrying would block every later edit.
        console.error('Modifica scartata', err)
        dequeue(c.key, batch.map(e => e.id))
        if (c.alive) show(view(c))
      } else {
        console.warn('Sincronizzazione rimandata', err)
        const delay = RETRY_MS[Math.min(c.attempt++, RETRY_MS.length - 1)]
        c.timer = setTimeout(() => flush(c), delay)
      }
    } finally {
      c.flushing = false
    }
    if (c.again) {
      c.again = false
      if (ok) flush(c)
    } else if (ok && loadQueue(c.key).length > 0) {
      flush(c)
    }
  }, [show, view])

  useEffect(() => {
    if (uid === undefined) return // auth still resolving
    if (!uid) {
      ctx.current = null
      show(opts.current.normalize(opts.current.loadLocal()))
      return
    }
    const c = {
      ref: doc(db, 'users', uid, ...opts.current.path),
      key: queueKey(uid, pathKey),
      base: null, alive: true, flushing: false, again: false, attempt: 0, timer: null, migrated: false,
    }
    ctx.current = c
    show(view(c)) // edits left from a previous session are visible right away

    const unsub = onSnapshot(c.ref, (snap) => {
      if (snap.exists()) {
        c.base = snap.data()
        show(view(c))
      } else if (!snap.metadata.fromCache) {
        // Confirmed by the server: first login, move the local data to the account.
        c.base = {}
        if (!c.migrated) {
          c.migrated = true
          const { normalize, loadLocal } = opts.current
          const ops = diffDoc(normalize({}), normalize(loadLocal()))
          if (ops.length > 0) enqueue(c.key, ops)
        }
        show(view(c))
        flush(c)
      }
    }, (err) => console.warn('Lettura non riuscita', err))

    const kick = () => { if (document.visibilityState !== 'hidden') flush(c) }
    window.addEventListener('online', kick)
    document.addEventListener('visibilitychange', kick)
    flush(c)

    return () => {
      c.alive = false
      clearTimeout(c.timer)
      unsub()
      window.removeEventListener('online', kick)
      document.removeEventListener('visibilitychange', kick)
      if (ctx.current === c) ctx.current = null
    }
  }, [uid, pathKey, show, view, flush])

  const update = useCallback((fn) => {
    const prev = dataRef.current
    const next = fn(prev)
    if (next == null || next === prev) return
    const c = ctx.current
    if (!c) {
      show(next)
      if (uidRef.current === null) {
        try { opts.current.saveLocal(next) } catch {}
      }
      return
    }
    const ops = diffDoc(prev, next)
    if (ops.length === 0) return
    enqueue(c.key, ops)
    show(view(c))
    flush(c)
  }, [show, view, flush])

  return [data, update]
}
