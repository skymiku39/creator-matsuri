import { useCallback, useEffect, useRef } from 'react'

type Options = {
  open: boolean
  onClose: () => void
  /** 預設 true：按 Escape 關閉（IME 組字中除外） */
  closeOnEscape?: boolean
}

/**
 * 避免「在輸入框拖曳選取文字、mouseup 落在背景」被當成點擊背景而關閉。
 * 僅當 pointerdown 與 click 都發生在 backdrop 本身才觸發 onClose。
 */
export function useBackdropDismiss({
  open,
  onClose,
  closeOnEscape = true,
}: Options) {
  const startedOnBackdrop = useRef(false)

  useEffect(() => {
    if (!open || !closeOnEscape) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (e.isComposing) return
      e.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, closeOnEscape])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    startedOnBackdrop.current = e.target === e.currentTarget
  }, [])

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && startedOnBackdrop.current) {
        onClose()
      }
      startedOnBackdrop.current = false
    },
    [onClose],
  )

  return { onPointerDown, onClick }
}
