import { useState, useCallback } from 'react'

export function useAI(apiKey, getInventoryText) {
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  const call = useCallback(async (systemPrompt, userPrompt) => {
    if (!apiKey.trim()) {
      setError('Inserisci la tua API key di Anthropic nelle impostazioni per usare questa funzione.')
      return
    }
    setLoading(true)
    setOutput('')
    setError('')

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          stream: true,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `Errore API: ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const evt = JSON.parse(data)
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              setOutput(prev => prev + evt.delta.text)
            }
          } catch {}
        }
      }
    } catch (e) {
      setError(e.message || 'Errore di connessione.')
    } finally {
      setLoading(false)
    }
  }, [apiKey])

  const fetchRicette = useCallback(() => {
    call(
      'Sei un cuoco italiano pratico e creativo. Rispondi sempre in italiano con un tono diretto e amichevole. Usa markdown leggero (## per titoli ricette, - per liste).',
      `Guarda la mia dispensa e suggerisci 3 ricette da fare ADESSO con quello che ho. È aprile in Lombardia. Dai priorità agli ingredienti marcati [DA USARE PRESTO].\n\nDISPENSA:\n${getInventoryText()}\n\nPer ogni ricetta: nome come titolo ##, ingredienti usati, preparazione in 3-4 passi, tempo stimato. Sii pratico.`
    )
  }, [call, getInventoryText])

  const fetchSpesa = useCallback(() => {
    call(
      'Sei un esperto di spesa intelligente e cucina italiana stagionale. Rispondi sempre in italiano con un tono diretto. Usa markdown leggero (## per categorie, - per liste).',
      `Analizza la mia dispensa e crea una lista della spesa per completare i pasti della settimana. È aprile in Lombardia.\n\nConsiderai:\n- Verdure e frutta di stagione primaverile (asparagi, piselli freschi, fave, spinaci, fragole, ecc.)\n- Proteine fresche mancanti\n- Bilanciamento dei pasti su 7 giorni\n- Non duplicare quello che ho già\n\nDISPENSA ATTUALE:\n${getInventoryText()}\n\nOrganizza per categoria. Aggiungi brevi note sulla stagionalità dove utile.`
    )
  }, [call, getInventoryText])

  return { loading, output, error, fetchRicette, fetchSpesa, clearOutput: () => setOutput('') }
}
