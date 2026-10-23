import { useEffect, useState } from 'react'

// A value that can be set ahead of its source: the menu highlight starts moving on the
// tap, while the (heavier) page change it triggers renders at low priority. It follows
// `value` again as soon as that changes.
export function useOptimisticValue(value) {
  const [optimistic, setOptimistic] = useState(value)
  useEffect(() => { setOptimistic(value) }, [value])
  return [optimistic, setOptimistic]
}
