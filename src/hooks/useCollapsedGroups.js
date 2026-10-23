import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'sk-pantry-collapsed'

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return new Set(Array.isArray(v) ? v.filter(k => typeof k === 'string') : [])
  } catch {
    return new Set()
  }
}

// Groups of Dispensa → "Per categoria" the user has folded, by group key
// ("<section>:<group id>"). Remembered on this device.
export function useCollapsedGroups() {
  const [collapsed, setCollapsed] = useState(load)

  useEffect(() => {
    try {
      if (collapsed.size) localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [collapsed])

  const toggle = useCallback(key => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }, [])

  return { collapsed, toggle }
}
