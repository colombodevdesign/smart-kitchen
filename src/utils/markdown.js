function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Minimal markdown for AI output: #/## → h3, ### → h4, **bold**, "- " lists.
// The text is escaped first: it comes from the model or from Firestore and is
// rendered with dangerouslySetInnerHTML.
export function md(text) {
  return escapeHtml(text ?? '')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, m => `<ul>${m}</ul>`)
    .split('\n')
    .filter(l => l.trim())
    .map(l => l.startsWith('<') ? l : `<p>${l}</p>`)
    .join('')
}
