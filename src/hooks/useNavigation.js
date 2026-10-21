import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_SUB } from '../nav/tabs.js'

// Navigation state without a router: { tab, sub, detail }.
// Detail views (a recipe, notification settings) push a history entry so the
// device Back button closes them instead of leaving the app.
export function useNavigation(initialTab = 'oggi') {
  const [tab, setTab] = useState(initialTab)
  const [sub, setSub] = useState(DEFAULT_SUB)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    const onPop = () => setDetail(null)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const openDetail = useCallback((d) => {
    window.history.pushState({ detail: true }, '')
    setDetail(d)
  }, [])

  const closeDetail = useCallback(() => {
    if (window.history.state?.detail) window.history.back()
    else setDetail(null)
  }, [])

  // Leaving a tab always drops an open detail view.
  const go = useCallback((nextTab, nextSub) => {
    setDetail(null)
    setTab(nextTab)
    if (nextSub) setSub(prev => ({ ...prev, [nextTab]: nextSub }))
  }, [])

  const setSubView = useCallback((forTab, value) => {
    setDetail(null)
    setSub(prev => ({ ...prev, [forTab]: value }))
  }, [])

  return { tab, sub, detail, go, setSubView, openDetail, closeDetail }
}
