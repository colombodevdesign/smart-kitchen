import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import styles from './Toast.module.css'

const ToastContext = createContext({ show: () => {}, dismiss: () => {}, visible: false })

// One toast at a time: a new one replaces the current one.
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const dismiss = useCallback(() => {
    clearTimeout(timer.current)
    setToast(null)
  }, [])

  const show = useCallback(({ message, actionLabel, onAction, ms = 5000 }) => {
    clearTimeout(timer.current)
    setToast({ message, actionLabel, onAction })
    timer.current = setTimeout(() => setToast(null), ms)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  const value = useMemo(() => ({ show, dismiss, visible: !!toast }), [show, dismiss, toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div className={styles.toast} role="status">
          <span>{toast.message}</span>
          {toast.actionLabel && (
            <button
              type="button"
              className={styles.action}
              onClick={() => { toast.onAction?.(); dismiss() }}
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
