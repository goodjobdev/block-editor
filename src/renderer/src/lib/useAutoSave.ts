import { useCallback, useRef, useEffect } from 'react'
import type { Page } from '../types/page'

export function useAutoSave(
  saveFn: (page: Page) => Promise<void>,
  delayMs: number
): { scheduleAutoSave: (page: Page) => void; flushNow: () => void } {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<Page | null>(null)

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (pendingRef.current) {
      const page = pendingRef.current
      pendingRef.current = null
      await saveFn(page)
    }
  }, [saveFn])

  // Flush on unmount to avoid losing last change
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const scheduleAutoSave = useCallback(
    (page: Page) => {
      pendingRef.current = page
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const p = pendingRef.current
        if (p) {
          pendingRef.current = null
          saveFn(p)
        }
      }, delayMs)
    },
    [saveFn, delayMs]
  )

  return { scheduleAutoSave, flushNow: flush }
}
