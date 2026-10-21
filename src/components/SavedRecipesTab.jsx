import { useState } from 'react'
import { md } from '../utils/markdown.js'
import styles from './SavedRecipesTab.module.css'

export function SavedRecipesTab({ recipes, onRemove }) {
  const [expanded, setExpanded] = useState({})

  if (recipes.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nessuna ricetta salvata ancora.</p>
        <p className={styles.hint}>Genera ricette con l'AI e salvale dalla scheda <strong>Ricette AI</strong>.</p>
      </div>
    )
  }

  function toggle(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.pageHeader}>
        <h2 className={styles.title}>Ricette Salvate</h2>
        <span className={styles.count}>{recipes.length}</span>
      </div>
      <div className={styles.list}>
        {recipes.map(r => (
          <div key={r.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <button className={styles.titleBtn} onClick={() => toggle(r.id)}>
                <span className={styles.arrow}>{expanded[r.id] ? '▾' : '▸'}</span>
                <span className={styles.recipeTitle}>{r.title}</span>
              </button>
              <div className={styles.cardMeta}>
                <span className={styles.savedAt}>{new Date(r.savedAt).toLocaleDateString('it-IT')}</span>
                <button className={styles.deleteBtn} onClick={() => onRemove(r.id)} title="Elimina">✕</button>
              </div>
            </div>
            {expanded[r.id] && (
              <div className={styles.content} dangerouslySetInnerHTML={{ __html: md(r.content) }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
