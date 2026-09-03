import { useCallback, useRef, useState } from 'react'
import { GoogleGenAI } from '@google/genai'

const GEMINI_API_KEY_STORAGE = 'gemini-api-key'
const MODEL_NAME = 'gemini-3-flash-preview'

// Receipts are photographed at full sensor resolution; the model doesn't need
// more than this and the inline payload stays small.
const MAX_EDGE = 1600
const JPEG_QUALITY = 0.85
const MAX_FILE_BYTES = 20 * 1024 * 1024

const PROMPT = `Sei un assistente per gestire una dispensa italiana. L'immagine è la foto di uno scontrino della spesa. Estrai i prodotti acquistati in un elenco strutturato.

Regole:
- Un oggetto per riga di prodotto. Se la riga indica più unità ("2 x LATTE", "3 PZ"), produci UN solo oggetto con qty pari alla quantità ("2", "3 pz").
- name: nome del prodotto in italiano, minuscolo, in forma estesa e leggibile. Espandi le abbreviazioni tipiche degli scontrini ("PNE CASER" → "pane casereccio", "MOZZ.BUFALA" → "mozzarella di bufala", "PASSATA POM." → "passata di pomodoro"). Togli marca, codici, sigle reparto e prezzi dal nome solo se il nome resta comprensibile.
- qty: stringa libera in italiano ("2", "500g", "1L"). Se lo scontrino non la indica, stringa vuota.
- section: scegli tra "credenza", "frigo", "freezer" secondo la conservazione tipica italiana.
  - frigo: latticini, salumi, uova, carne e pesce freschi, verdure fresche delicate, yogurt, panna, pasta fresca
  - freezer: tutto ciò che è esplicitamente surgelato/gelato/congelato
  - credenza: pasta, riso, scatolame, oli, conserve, biscotti, prodotti secchi, bevande non deperibili, frutta e verdura non deperibile
- raw: copia testuale della riga dello scontrino così com'è scritta, senza il prezzo.
- IGNORA tutto ciò che non è cibo o bevanda: detersivi, prodotti per la casa e per l'igiene, sacchetti, articoli non alimentari.
- IGNORA righe che non sono prodotti: intestazione e indirizzo del negozio, totale, subtotale, sconti, resto, contante/carta, IVA, punti fedeltà, data, numero scontrino, codici a barre.
- Se la foto non è uno scontrino o non riesci a leggere nessun prodotto, restituisci [].
Restituisci SOLO JSON conforme allo schema.`

const RESPONSE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name:    { type: 'string' },
      qty:     { type: 'string' },
      section: { type: 'string', enum: ['credenza', 'frigo', 'freezer'] },
      raw:     { type: 'string' },
    },
    required: ['name', 'section'],
  },
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Errore lettura immagine'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Formato immagine non supportato dal browser.'))
    img.src = dataUrl
  })
}

function stripDataUrl(dataUrl) {
  const comma = dataUrl.indexOf(',')
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
}

/**
 * Reads the photo, downscales it to MAX_EDGE and re-encodes it as JPEG.
 * Returns `{ mimeType, data, preview }` — `preview` is the (downscaled)
 * data URL shown in the modal while the model works.
 */
async function prepareImage(file) {
  const dataUrl = await readAsDataURL(file)
  const img = await loadImage(dataUrl)
  const longest = Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height)
  if (!longest) throw new Error('Immagine non valida.')

  const scale = Math.min(1, MAX_EDGE / longest)
  const w = Math.round((img.naturalWidth || img.width) * scale)
  const h = Math.round((img.naturalHeight || img.height) * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Impossibile elaborare l\'immagine.')
  ctx.drawImage(img, 0, 0, w, h)

  let out
  try { out = canvas.toDataURL('image/jpeg', JPEG_QUALITY) }
  catch { throw new Error('Impossibile elaborare l\'immagine.') }

  return { mimeType: 'image/jpeg', data: stripDataUrl(out), preview: out }
}

function parseApiError(err) {
  const msg = err?.message || ''
  if (msg.includes('429') || msg.toLowerCase().includes('quota'))
    return 'Quota Gemini esaurita. Riprova tra qualche minuto.'
  if (msg.includes('API_KEY_INVALID') || msg.includes('API key'))
    return 'API key non valida. Controlla le Impostazioni.'
  if (msg.toLowerCase().includes('unsupported') || msg.includes('400'))
    return 'Il modello non ha accettato l\'immagine. Prova con una foto più nitida.'
  return msg || 'Errore di connessione con Gemini.'
}

/**
 * Receipt photo → pantry items, via Gemini vision.
 * State machine: 'idle' → 'processing' → 'ready' | 'error' → (reset) → 'idle'
 * - When status === 'ready', `items` holds the parsed candidates.
 * - `preview` is the data URL of the processed photo (set as soon as it's read).
 */
export function useReceiptScan() {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])
  const [preview, setPreview] = useState(null)

  // Bumped on every scan/reset: results from a superseded run are discarded.
  const runRef = useRef(0)

  const scan = useCallback(async (file) => {
    const run = ++runRef.current
    setError(null)
    setItems([])
    setPreview(null)

    if (!file) {
      setStatus('idle')
      return
    }
    if (!file.type?.startsWith('image/')) {
      setError({ message: 'Seleziona un\'immagine dello scontrino.' })
      setStatus('error')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError({ message: 'Immagine troppo grande. Riprova con una foto più leggera.' })
      setStatus('error')
      return
    }
    const apiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE)
    if (!apiKey) {
      setError({ message: 'API key non configurata. Vai in Impostazioni per inserirla.' })
      setStatus('error')
      return
    }

    setStatus('processing')
    try {
      const { mimeType, data, preview: previewUrl } = await prepareImage(file)
      if (runRef.current !== run) return
      setPreview(previewUrl)

      const ai = new GoogleGenAI({ apiKey })
      const res = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [{ role: 'user', parts: [
          { text: PROMPT },
          { inlineData: { mimeType, data } },
        ]}],
        config: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      })
      if (runRef.current !== run) return

      const text = res?.text ?? ''
      let parsed
      try { parsed = JSON.parse(text) }
      catch { throw new Error('Risposta non in formato JSON valido.') }
      if (!Array.isArray(parsed)) parsed = []
      const clean = parsed
        .filter(it => it && typeof it.name === 'string' && it.name.trim())
        .map(it => ({
          name: it.name.trim(),
          qty: typeof it.qty === 'string' ? it.qty.trim() : '',
          section: ['credenza', 'frigo', 'freezer'].includes(it.section) ? it.section : 'credenza',
          hint: typeof it.raw === 'string' ? it.raw.trim() : '',
        }))
      setItems(clean)
      setStatus('ready')
    } catch (err) {
      if (runRef.current !== run) return
      setError({ message: parseApiError(err) })
      setStatus('error')
    }
  }, [])

  const reset = useCallback(() => {
    runRef.current++
    setStatus('idle')
    setError(null)
    setItems([])
    setPreview(null)
  }, [])

  return { status, error, items, preview, scan, reset }
}
