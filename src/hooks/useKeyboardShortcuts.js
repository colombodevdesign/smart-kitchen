import { useEffect, useRef } from 'react'

const TYPING = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'

// Single-key shortcuts (no Ctrl/Cmd/Alt, so they behave the same on Windows and
// Mac and never collide with browser shortcuts). `bindings` maps a key to a
// handler: letters in lowercase ('n'), others as KeyboardEvent.key ('\\', '?', 'Escape').
// Ignored while typing in a field and while any modal dialog is open.
export function useKeyboardShortcuts(bindings, enabled = true) {
  const bindingsRef = useRef(bindings)
  useEffect(() => { bindingsRef.current = bindings })

  useEffect(() => {
    if (!enabled) return
    const onKey = (e) => {
      if (e.defaultPrevented || e.isComposing || e.repeat) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.target instanceof Element && e.target.closest(TYPING)) return
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
      const handler = bindingsRef.current[e.key.length === 1 ? e.key.toLowerCase() : e.key]
      if (!handler) return
      e.preventDefault()
      handler()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [enabled])
}
