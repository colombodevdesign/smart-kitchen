// Changes to a synced document expressed as operations instead of a whole new copy.
//
// The data documents (pantry, meals, saved recipes, shopping list, preferences) are
// maps whose values are lists of entities with an `id` (or lists of strings). A copy
// held by a device can be old: opened from the offline cache, or edited while the
// connection was down. Writing that copy back would erase what other devices did in
// the meantime. So each edit is turned into operations on single entities and fields
// (diffDoc) and replayed on the server's current version (applyOps): only what the
// user actually changed is written.
//
// Operations (all idempotent: replaying one already applied changes nothing):
//   { op: 'put',    key, item }               insert the entity, or replace the one with the same id
//   { op: 'patch',  key, id, set, unset }     change some fields; skipped if the entity is gone
//   { op: 'del',    key, id }                 remove the entity
//   { op: 'add',    key, value }              add a string/number to a list (if missing)
//   { op: 'remove', key, value }              remove it
//   { op: 'set',    key, value } / { op: 'unset', key }   any other top-level value

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function isEntity(v) {
  return isPlainObject(v) && v.id != null
}

function isPrimitive(v) {
  return v === null || ['string', 'number', 'boolean'].includes(typeof v)
}

export function sameValue(a, b) {
  if (a === b) return true
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((v, i) => sameValue(v, b[i]))
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ka = Object.keys(a).filter(k => a[k] !== undefined)
    const kb = Object.keys(b).filter(k => b[k] !== undefined)
    return ka.length === kb.length && ka.every(k => sameValue(a[k], b[k]))
  }
  return false
}

// Firestore rejects undefined: fields set to undefined are simply absent.
function clean(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v
  return out
}

function listKind(a, b) {
  const all = [...(a ?? []), ...(b ?? [])]
  if (all.length === 0) return 'empty'
  if (all.every(isEntity)) return 'entities'
  if (all.every(isPrimitive)) return 'values'
  return 'other'
}

function diffEntity(key, a, b) {
  const set = {}
  const unset = []
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (b[k] === undefined) { if (a[k] !== undefined) unset.push(k) }
    else if (!sameValue(a[k], b[k])) set[k] = b[k]
  }
  if (Object.keys(set).length === 0 && unset.length === 0) return null
  return { op: 'patch', key, id: b.id, set, unset }
}

export function diffDoc(prev, next) {
  const ops = []
  const p = prev ?? {}
  const n = next ?? {}
  for (const key of new Set([...Object.keys(p), ...Object.keys(n)])) {
    const a = p[key]
    const b = n[key]
    if (sameValue(a, b)) continue
    const lists = (a === undefined || Array.isArray(a)) && (b === undefined || Array.isArray(b))
    const kind = lists ? listKind(a, b) : 'other'
    if (kind === 'entities') {
      const before = new Map((a ?? []).map(e => [e.id, e]))
      const after = new Set()
      for (const e of b ?? []) {
        after.add(e.id)
        const old = before.get(e.id)
        if (!old) ops.push({ op: 'put', key, item: clean(e) })
        else {
          const patch = diffEntity(key, old, e)
          if (patch) ops.push(patch)
        }
      }
      for (const id of before.keys()) if (!after.has(id)) ops.push({ op: 'del', key, id })
    } else if (kind === 'values') {
      const before = new Set(a ?? [])
      const after = new Set(b ?? [])
      for (const v of after) if (!before.has(v)) ops.push({ op: 'add', key, value: v })
      for (const v of before) if (!after.has(v)) ops.push({ op: 'remove', key, value: v })
    } else if (kind !== 'empty') {
      ops.push(b === undefined ? { op: 'unset', key } : { op: 'set', key, value: b })
    }
  }
  return ops
}

// Applies the operations to `doc` (not modified) and returns the new document.
// Lists left empty are dropped, except the keys in `keep`, which always exist.
export function applyOps(doc, ops, keep = []) {
  const out = { ...(doc ?? {}) }
  const list = key => (Array.isArray(out[key]) ? out[key] : [])
  for (const o of ops) {
    switch (o.op) {
      case 'put': {
        const items = list(o.key)
        const i = items.findIndex(e => e?.id === o.item.id)
        out[o.key] = i >= 0 ? items.map((e, j) => (j === i ? o.item : e)) : [...items, o.item]
        break
      }
      case 'patch': {
        const items = list(o.key)
        if (!items.some(e => e?.id === o.id)) break // deleted elsewhere: the deletion wins
        out[o.key] = items.map(e => {
          if (e?.id !== o.id) return e
          const merged = { ...e, ...o.set }
          for (const k of o.unset ?? []) delete merged[k]
          return merged
        })
        break
      }
      case 'del':
        out[o.key] = list(o.key).filter(e => e?.id !== o.id)
        break
      case 'add':
        if (!list(o.key).includes(o.value)) out[o.key] = [...list(o.key), o.value]
        break
      case 'remove':
        out[o.key] = list(o.key).filter(v => v !== o.value)
        break
      case 'set':
        out[o.key] = o.value
        break
      case 'unset':
        delete out[o.key]
        break
    }
  }
  for (const [key, value] of Object.entries(out)) {
    if (Array.isArray(value) && value.length === 0 && !keep.includes(key)) delete out[key]
  }
  for (const key of keep) if (!Array.isArray(out[key])) out[key] = []
  return out
}
