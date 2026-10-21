import { AddSheet } from './AddSheet.jsx'
import { VoiceBatchModal } from './VoiceBatchModal.jsx'
import { ReceiptScanModal } from './ReceiptScanModal.jsx'
import { useToast } from './ui/Toast.jsx'
import { SECTION_LABELS } from '../data/initialInventory.js'

// One entry point for adding products. `state.mode` is 'closed' | 'sheet' |
// 'voice' | 'receipt': only one dialog is ever open, so modals never nest
// (the sheet closes before the voice/receipt flow opens).
export function AddFlow({ state, onClose, onSwitch, onAdd, onAddBatch, onGoApiKey }) {
  const toast = useToast()

  function handleSubmit({ section, name, qty, expiry }) {
    onAdd(section, name, qty, expiry)
    toast.show({ message: `${name.trim()} aggiunto in ${SECTION_LABELS[section].toLowerCase()}`, ms: 3000 })
    onClose()
  }

  function handleBatch(items) {
    onAddBatch(items)
    const n = items.length
    toast.show({ message: n === 1 ? '1 prodotto aggiunto' : `${n} prodotti aggiunti`, ms: 3000 })
  }

  return (
    <>
      <AddSheet
        open={state.mode === 'sheet'}
        section={state.section}
        onClose={onClose}
        onSwitch={onSwitch}
        onSubmit={handleSubmit}
        onGoApiKey={onGoApiKey}
      />
      <VoiceBatchModal open={state.mode === 'voice'} onClose={onClose} onConfirm={handleBatch} />
      <ReceiptScanModal open={state.mode === 'receipt'} onClose={onClose} onConfirm={handleBatch} />
    </>
  )
}
