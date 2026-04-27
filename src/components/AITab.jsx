import { useEffect, useRef } from 'react'
import styles from './AITab.module.css'

export function AITab({ title, buttonLabel, onFetch, loading, output, error, hasApiKey }) {
  const outputRef = useRef(null)

  useEffect(() => {
    if (output && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  const md = (text) => text
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, m => `<ul>${m}</ul>`)
    .split('\n')
    .filter(l => l.trim())
    .map(l => l.startsWith('<') ? l : `<p>${l}</p>`)
    .join('')

  return (
    <div className={styles.wrap}>
      {!hasApiKey && (
        <div className={styles.notice}>
          <LockIcon />
          <span>Configura la tua API key Anthropic nelle <strong>impostazioni</strong> per usare questa funzione.</span>
        </div>
      )}

      <button
        className={styles.btn}
        onClick={onFetch}
        disabled={loading || !hasApiKey}
      >
        {loading ? <><Spinner /> elaborazione...</> : buttonLabel}
      </button>

      {error && <div className={styles.error}>{error}</div>}

      {(output || loading) && (
        <div className={styles.output} ref={outputRef}>
          {output
            ? <div dangerouslySetInnerHTML={{ __html: md(output) }} />
            : <div className={styles.skeleton}><Spinner /> generazione in corso...</div>
          }
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <span className={styles.spinner}>
      <span/><span/><span/>
    </span>
  )
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="6" width="10" height="7" rx="2"/>
      <path d="M4.5 6V4a2.5 2.5 0 015 0v2"/>
    </svg>
  )
}
