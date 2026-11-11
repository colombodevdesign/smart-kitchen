// Edits not yet confirmed by the server, per user and document. They live in
// localStorage so that they survive a reload or a closed app while offline, and
// are shared by the tabs of the same browser (replaying an entry twice is harmless:
// see docPatch.js). Where localStorage is unavailable they stay in memory.

const memory = new Map()

export function queueKey(uid, path) {
  return `sk-pending:${uid}:${path}`
}

export function loadQueue(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return memory.get(key) ?? []
  }
}

export function saveQueue(key, entries) {
  try {
    if (entries.length === 0) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(entries))
  } catch {
    if (entries.length === 0) memory.delete(key)
    else memory.set(key, entries)
  }
}

export function enqueue(key, ops) {
  const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ops }
  saveQueue(key, [...loadQueue(key), entry])
  return entry
}

export function dequeue(key, ids) {
  const done = new Set(ids)
  saveQueue(key, loadQueue(key).filter(e => !done.has(e.id)))
}
