import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_SUB } from '../nav/tabs.js'

// How long the page-transition CSS needs; `motion` goes back to 'none' after it so
// content that appears later (data loading in) doesn't replay the entrance.
const MOTION_MS = 600

// Navigation state without a router: { tab, sub, detail }.
// Detail views (a recipe, notification settings) push a history entry so the
// device Back button closes them instead of leaving the app.
// `motion` ({ kind, n }) says what the last change was, for the entrance animation:
// 'tab' between tabs, 'detail' when a detail opens / closes.
export function useNavigation(initialTab = 'oggi') {
  const [tab, setTab] = useState(initialTab)
  const [sub, setSub] = useState(DEFAULT_SUB)
  const [detail, setDetail] = useState(null)
  const [motion, setMotion] = useState({ kind: 'none', n: 0 })

  // Latest values for the callbacks below, so they keep a stable identity.
  const tabRef = useRef(tab)
  const detailRef = useRef(detail)
  tabRef.current = tab
  detailRef.current = detail

  const animate = useCallback((kind) => setMotion(m => ({ kind, n: m.n + 1 })), [])

  useEffect(() => {
    if (motion.kind === 'none') return
    const t = setTimeout(() => setMotion(m => (m.n === motion.n ? { kind: 'none', n: m.n } : m)), MOTION_MS)
    return () => clearTimeout(t)
  }, [motion])

  useEffect(() => {
    const onPop = () => {
      if (detailRef.current) animate('detail')
      setDetail(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [animate])

  const openDetail = useCallback((d) => {
    window.history.pushState({ detail: true }, '')
    animate('detail')
    setDetail(d)
  }, [animate])

  const closeDetail = useCallback(() => {
    if (window.history.state?.detail) window.history.back()
    else {
      if (detailRef.current) animate('detail')
      setDetail(null)
    }
  }, [animate])

  // Leaving a tab always drops an open detail view.
  const go = useCallback((nextTab, nextSub) => {
    const from = tabRef.current
    if (nextTab !== from) animate('tab')
    else if (detailRef.current) animate('detail')
    setDetail(null)
    setTab(nextTab)
    if (nextSub) setSub(prev => ({ ...prev, [nextTab]: nextSub }))
  }, [animate])

  const setSubView = useCallback((forTab, value) => {
    if (detailRef.current) animate('detail')
    setDetail(null)
    setSub(prev => ({ ...prev, [forTab]: value }))
  }, [animate])

  return { tab, sub, detail, motion: motion.kind, go, setSubView, openDetail, closeDetail }
}
