import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SimChoiceLayout } from '../../domain/types'

export interface SimChoiceOption {
  choiceId: string
  letter: string
  text: string
}

interface Props {
  options: SimChoiceOption[]
  layouts: SimChoiceLayout[]
  onLayoutsChange: (layouts: SimChoiceLayout[]) => void
  onPick: (choiceId: string) => void
}

const DEFAULT_X = 62
const DEFAULT_Y0 = 8
const DEFAULT_Y_STEP = 9
const DRAG_THRESHOLD_PX = 4

function defaultPos(index: number): { xPct: number; yPct: number } {
  return {
    xPct: DEFAULT_X,
    yPct: DEFAULT_Y0 + index * DEFAULT_Y_STEP,
  }
}

function clampPct(v: number) {
  return Math.min(92, Math.max(2, v))
}

/**
 * 模擬畫面選項：一般點選進入分支；
 * Shift 點選可多選，拖曳移動位置並寫回 meta.simChoiceLayouts。
 */
export function SimChoiceOverlay({
  options,
  layouts,
  onLayoutsChange,
  onPick,
}: Props) {
  const layerRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [liveOffset, setLiveOffset] = useState<{
    dxPct: number
    dyPct: number
  } | null>(null)
  const liveOffsetRef = useRef(liveOffset)
  liveOffsetRef.current = liveOffset

  const dragRef = useRef<{
    letters: string[]
    startClientX: number
    startClientY: number
    origins: Map<string, { xPct: number; yPct: number }>
    moved: boolean
    pointerId: number
  } | null>(null)

  const layoutByLetter = useMemo(() => {
    const map = new Map<string, SimChoiceLayout>()
    for (const l of layouts) map.set(l.letter.toUpperCase(), l)
    return map
  }, [layouts])

  const resolved = useMemo(() => {
    return options.map((opt, index) => {
      const letter = opt.letter.toUpperCase()
      const saved = layoutByLetter.get(letter)
      const pos = saved
        ? { xPct: saved.xPct, yPct: saved.yPct }
        : defaultPos(index)
      return { ...opt, letter, ...pos }
    })
  }, [options, layoutByLetter])

  const commitLayouts = useCallback(
    (next: Map<string, { xPct: number; yPct: number }>) => {
      const merged = new Map<string, SimChoiceLayout>()
      for (const l of layouts) merged.set(l.letter.toUpperCase(), { ...l })
      for (const opt of resolved) {
        const letter = opt.letter
        const pos = next.get(letter) ?? { xPct: opt.xPct, yPct: opt.yPct }
        merged.set(letter, {
          letter,
          xPct: clampPct(pos.xPct),
          yPct: clampPct(pos.yPct),
        })
      }
      onLayoutsChange(
        [...merged.values()].sort((a, b) => a.letter.localeCompare(b.letter)),
      )
    },
    [layouts, onLayoutsChange, resolved],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(new Set())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onPointerDown = (e: React.PointerEvent, letter: string) => {
    if (e.button !== 0) return
    if (!layerRef.current) return

    let nextSelected = new Set(selected)
    if (e.shiftKey) {
      if (nextSelected.has(letter)) nextSelected.delete(letter)
      else nextSelected.add(letter)
      setSelected(nextSelected)
    } else if (!nextSelected.has(letter)) {
      nextSelected = new Set([letter])
      setSelected(nextSelected)
    }

    const letters = [...nextSelected]
    if (!letters.includes(letter)) letters.push(letter)

    const origins = new Map<string, { xPct: number; yPct: number }>()
    for (const item of resolved) {
      if (letters.includes(item.letter)) {
        origins.set(item.letter, { xPct: item.xPct, yPct: item.yPct })
      }
    }

    dragRef.current = {
      letters,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origins,
      moved: false,
      pointerId: e.pointerId,
    }
    setLiveOffset(null)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const layer = layerRef.current
    if (!layer) return

    const dx = e.clientX - drag.startClientX
    const dy = e.clientY - drag.startClientY
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
    drag.moved = true

    const rect = layer.getBoundingClientRect()
    setLiveOffset({
      dxPct: (dx / rect.width) * 100,
      dyPct: (dy / rect.height) * 100,
    })
  }

  const finishPointer = (e: React.PointerEvent, choiceId: string) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null

    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }

    const offset = liveOffsetRef.current
    if (drag.moved && offset) {
      const next = new Map<string, { xPct: number; yPct: number }>()
      for (const [L, origin] of drag.origins) {
        next.set(L, {
          xPct: clampPct(origin.xPct + offset.dxPct),
          yPct: clampPct(origin.yPct + offset.dyPct),
        })
      }
      commitLayouts(next)
      setLiveOffset(null)
      return
    }

    setLiveOffset(null)
    if (!e.shiftKey && !drag.moved) {
      onPick(choiceId)
      setSelected(new Set())
    }
  }

  return (
    <div
      ref={layerRef}
      className="rpg-choices-layer"
      role="menu"
      aria-label="對話選項（Shift 多選後可拖曳位置）"
    >
      <p className="rpg-choices-hint" aria-hidden>
        Shift 多選後拖曳可調整位置
      </p>
      {resolved.map((opt) => {
        const isSel = selected.has(opt.letter)
        const dragging =
          Boolean(liveOffset) &&
          Boolean(dragRef.current?.letters.includes(opt.letter))
        const offset =
          dragging && liveOffset ? liveOffset : { dxPct: 0, dyPct: 0 }
        const left = clampPct(opt.xPct + offset.dxPct)
        const top = clampPct(opt.yPct + offset.dyPct)
        return (
          <button
            key={opt.choiceId}
            type="button"
            role="menuitem"
            className={`rpg-choice${isSel ? ' rpg-choice--selected' : ''}${
              dragging ? ' rpg-choice--dragging' : ''
            }`}
            style={{ left: `${left}%`, top: `${top}%` }}
            onPointerDown={(e) => onPointerDown(e, opt.letter)}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => finishPointer(e, opt.choiceId)}
            onPointerCancel={(e) => finishPointer(e, opt.choiceId)}
          >
            {opt.text}
          </button>
        )
      })}
    </div>
  )
}
