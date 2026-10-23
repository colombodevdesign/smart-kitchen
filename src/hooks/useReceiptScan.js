import { useCallback, useRef, useState } from 'react'
import { GoogleGenAI } from '@google/genai'
import { MODEL_PRO, PRO_CONFIG } from '../ai/model.js'
import { classifyError } from '../ai/errors.js'

const GEMINI_API_KEY_STORAGE = 'gemini-api-key'

// Receipts are photographed at full sensor resolution; the model doesn't need
// more than this and the inline payload stays small.
const MAX_EDGE = 1600
const JPEG_QUALITY = 0.85
const MAX_FILE_BYTES = 20 * 1024 * 1024
// PDFs go to the model as-is. The request is capped at ~20 MB and base64 adds a third.
const MAX_PDF_BYTES = 14 * 1024 * 1024
const PDF_MIME = 'application/pdf'

const isPdf = (file) => file.type === PDF_MIME || /\.pdf$/i.test(file.name || '')

const PROMPT = `Sei un assistente per gestire una dispensa italiana. Il file allegato è uno scontrino della spesa: una foto oppure un documento PDF (scontrino elettronico, ricevuta o riepilogo di un ordine di spesa online, anche su più pagine). Estrai i prodotti acquistati in un elenco strutturato.

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
- Se il file non è uno scontrino o non riesci a leggere nessun prodotto, restituisci [].
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
    reader.onerror = () => reject(new Error('Errore lettura del file'))
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

function readAsBase64(file) {
  return readAsDataURL(file).then(stripDataUrl)
}

function parseApiError(err) {
  const { code, message } = classifyError(err)
  if (code !== 'unknown') return message
  const msg = err?.message || ''
  if (msg.toLowerCase().includes('unsupported') || msg.includes('400'))
    return 'Il modello non ha accettato il file. Prova con una foto più nitida o un altro PDF.'
  return message || 'Errore di connessione con Gemini.'
}

/**
 * Receipt photo or PDF → pantry items, via Gemini.
 * State machine: 'idle' → 'processing' → 'ready' | 'error' → (reset) → 'idle'
 * - When status === 'ready', `items` holds the parsed candidates.
 * - `preview` is the data URL of the processed photo (set as soon as it's read);
 *   it stays null for PDFs, which the UI shows through `source` instead.
 * - `source` is `{ kind: 'image' | 'pdf', name }` for the file being processed.
 */
export function useReceiptScan() {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])
  const [preview, setPreview] = useState(null)
  const [source, setSource] = useState(null)

  // Bumped on every scan/reset: results from a superseded run are discarded.
  const runRef = useRef(0)

  const scan = useCallback(async (file) => {
    const run = ++runRef.current
    setError(null)
    setItems([])
    setPreview(null)
    setSource(null)

    if (!file) {
      setStatus('idle')
      return
    }
    const pdf = isPdf(file)
    if (!pdf && !file.type?.startsWith('image/')) {
      setError({ message: 'Seleziona una foto o un PDF dello scontrino.' })
      setStatus('error')
      return
    }
    if (pdf ? file.size > MAX_PDF_BYTES : file.size > MAX_FILE_BYTES) {
      setError({ message: pdf
        ? 'PDF troppo grande (massimo 14 MB). Prova con un file più leggero.'
        : 'Immagine troppo grande. Riprova con una foto più leggera.' })
      setStatus('error')
      return
    }
    const apiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE)
    if (!apiKey) {
      setError({ message: 'API key non configurata. Impostala in Tu.' })
      setStatus('error')
      return
    }

    setSource({ kind: pdf ? 'pdf' : 'image', name: file.name || '' })
    setStatus('processing')
    try {
      let mimeType, data
      if (pdf) {
        mimeType = PDF_MIME
        data = await readAsBase64(file)
      } else {
        const prepared = await prepareImage(file)
        ;({ mimeType, data } = prepared)
        if (runRef.current !== run) return
        setPreview(prepared.preview)
      }
      if (runRef.current !== run) return

      const ai = new GoogleGenAI({ apiKey })
      const res = await ai.models.generateContent({
        model: MODEL_PRO,
        contents: [{ role: 'user', parts: [
          { text: PROMPT },
          { inlineData: { mimeType, data } },
        ]}],
        config: {
          ...PRO_CONFIG,
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
    setSource(null)
  }, [])

  return { status, error, items, preview, source, scan, reset }
}
