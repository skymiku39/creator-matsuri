import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  canRedo,
  canUndo,
  clearHistory,
  commitDebounced,
  commitNow,
  historyDepth,
  redo,
  takeSnapshot,
  undo,
} from '../store/editHistory'
import type { BoothMeta } from './types'

const meta = (name: string): BoothMeta => ({
  boothId: '01',
  boothName: name,
  locale: 'zh_TW',
})

function snap(name: string) {
  return takeSnapshot(meta(name), [], [])
}

beforeEach(() => {
  clearHistory()
  vi.useRealTimers()
})

describe('editHistory', () => {
  it('commitNow 後可 undo／redo', () => {
    const a = snap('A')
    const b = snap('B')
    commitNow(a)
    expect(canUndo()).toBe(true)
    const undone = undo(b)
    expect(undone?.meta.boothName).toBe('A')
    expect(canRedo()).toBe(true)
    const redone = redo(undone!)
    expect(redone?.meta.boothName).toBe('B')
  })

  it('debounce 連續編輯只記一次 before', () => {
    vi.useFakeTimers()
    const a = snap('A')
    commitDebounced(a, 100)
    commitDebounced(snap('mid'), 100)
    expect(historyDepth().past).toBe(0)
    expect(historyDepth().pending).toBe(true)
    vi.advanceTimersByTime(100)
    expect(historyDepth().past).toBe(1)
    const undone = undo(snap('B'))
    expect(undone?.meta.boothName).toBe('A')
  })

  it('clearHistory 清空堆疊', () => {
    commitNow(snap('A'))
    clearHistory()
    expect(canUndo()).toBe(false)
    expect(canRedo()).toBe(false)
  })
})
