import { useEffect, useRef } from 'react'
import styles from './AITab.module.css'

export function AITab({ buttonLabel, onFetch, loading, output, error }) {
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
      <button
        className={styles.btn}
        onClick={onFetch}
        disabled={loading}
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

