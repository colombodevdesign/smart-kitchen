import { useCallback, useState } from 'react'

let seq = 0

/**
 * Editable candidate list shared by the batch-import modals (voice, scontrino).
 * A candidate is `{ id, name, qty, section, hint?, checked }`: the AI output
 * plus a stable id and the include/exclude flag driven by the checkbox.
 */
export function useBatchCandidates(prefix = 'b') {
  const [candidates, setCandidates] = useState([])

  const hydrate = useCallback((items) => {
    setCandidates((items ?? []).map(it => ({
      ...it,
      id: `${prefix}-${Date.now()}-${seq++}`,
      checked: true,
    })))
  }, [prefix])

  const clear  = useCallback(() => setCandidates([]), [])
  const update = useCallback((id, patch) =>
    setCandidates(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c))), [])
  const remove = useCallback((id) =>
    setCandidates(prev => prev.filter(c => c.id !== id)), [])
  const toggle = useCallback((id) =>
    setCandidates(prev => prev.map(c => (c.id === id ? { ...c, checked: !c.checked } : c))), [])

  const selected = candidates.filter(c => c.checked && c.name.trim())

  // Strips the UI-only fields: what the inventory actually stores.
  const picked = () => selected.map(({ name, qty, section }) => ({ name, qty, section }))

  return { candidates, hydrate, clear, update, remove, toggle, selected, picked }
}
