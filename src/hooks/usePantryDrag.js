import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

// Pixels the pointer has to travel before a press becomes a drag (below it, it's a click).
const THRESHOLD = 5
// The copy keeps the width of a column row, also when dragged out of the wide table.
const MAX_GHOST_WIDTH = 340

// Drop areas: the section cards ([data-section]) under `container`. A card with
// nothing below it reaches down to the bottom of the viewport, so a short column
// is as easy to hit as a long one.
function hitSection(container, x, y) {
  if (!container) return null
  const cards = [...container.querySelectorAll('[data-section]')].map(el => ({
    section: el.dataset.section,
    r: el.getBoundingClientRect(),
  }))
  for (const c of cards) {
    const below = cards.some(o => o !== c && o.r.top > c.r.top && o.r.left < c.r.right && o.r.right > c.r.left)
    const bottom = below ? c.r.bottom : Math.max(c.r.bottom, window.innerHeight)
    if (x >= c.r.left && x <= c.r.right && y >= c.r.top && y <= bottom) return c.section
  }
  return null
}

// Drag of a desktop pantry row onto another section card, mouse only. The row stays
// in its list (dimmed) and a copy follows the pointer in a portal: the cards' layout
// transforms and the folded groups' overflow would clip the row itself.
// A drop on another card calls onDrop(fromSection, id, toSection); Esc cancels.
export function usePantryDrag({ containerRef, enabled, onDrop }) {
  const [drag, setDrag] = useState(null)     // { id, section, item, width } while dragging
  const [target, setTarget] = useState(null) // card under the pointer, if not the source
  const ghostRef = useRef(null)
  const state = useRef(null)
  const listeners = useRef(null)
  const suppressClick = useRef(false)
  const onDropRef = useRef(onDrop)
  useEffect(() => { onDropRef.current = onDrop }, [onDrop])

  const end = useCallback(() => {
    if (listeners.current) {
      window.removeEventListener('pointermove', listeners.current.move)
      window.removeEventListener('pointerup', listeners.current.up)
      window.removeEventListener('pointercancel', listeners.current.cancel)
      window.removeEventListener('keydown', listeners.current.key, true)
      listeners.current = null
    }
    delete document.body.dataset.dragging
    state.current = null
    setDrag(null)
    setTarget(null)
  }, [])

  useEffect(() => end, [end])
  useEffect(() => { if (!enabled) end() }, [enabled, end])

  // The copy appears under the pointer, where the row was grabbed.
  useLayoutEffect(() => {
    const s = state.current
    if (drag && ghostRef.current && s) ghostRef.current.style.transform = `translate(${s.x}px, ${s.y}px)`
  }, [drag])

  const onRowPointerDown = useCallback((e, item, section) => {
    if (!enabled || e.button !== 0 || e.pointerType !== 'mouse') return
    end()
    state.current = { item, section, el: e.currentTarget, startX: e.clientX, startY: e.clientY, started: false, target: null }

    const move = ev => {
      const s = state.current
      if (!s) return
      if (!s.started) {
        if (Math.hypot(ev.clientX - s.startX, ev.clientY - s.startY) < THRESHOLD) return
        const r = s.el.getBoundingClientRect()
        s.started = true
        const width = Math.min(r.width, MAX_GHOST_WIDTH)
        s.dx = Math.min(s.startX - r.left, width - 24)
        s.dy = s.startY - r.top
        document.body.dataset.dragging = ''
        window.getSelection?.()?.removeAllRanges()
        setDrag({ id: s.item.id, section: s.section, item: s.item, width })
      }
      s.x = ev.clientX - s.dx
      s.y = ev.clientY - s.dy
      if (ghostRef.current) ghostRef.current.style.transform = `translate(${s.x}px, ${s.y}px)`
      const hit = hitSection(containerRef.current, ev.clientX, ev.clientY)
      const next = hit && hit !== s.section ? hit : null
      if (next !== s.target) {
        s.target = next
        setTarget(next)
      }
    }
    const up = () => {
      const s = state.current
      end()
      if (!s?.started) return
      // The click that follows the release must not open the edit sheet.
      suppressClick.current = true
      setTimeout(() => { suppressClick.current = false }, 0)
      if (s.target) onDropRef.current?.(s.section, s.item.id, s.target)
    }
    const cancel = () => end()
    const key = ev => {
      if (ev.key !== 'Escape' || !state.current?.started) return
      ev.preventDefault()
      ev.stopPropagation()
      end()
    }
    listeners.current = { move, up, cancel, key }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', key, true)
  }, [enabled, end, containerRef])

  const onClickCapture = useCallback(e => {
    if (!suppressClick.current) return
    e.stopPropagation()
    e.preventDefault()
  }, [])

  return { drag, target, ghostRef, onRowPointerDown, onClickCapture }
}
