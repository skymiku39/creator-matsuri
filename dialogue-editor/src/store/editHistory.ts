import type { Edge } from '@xyflow/react'
import type { FlowNode } from '../domain/flowGraph'
import type { BoothMeta } from '../domain/types'

/** 可還原的畫布／專案快照（不含選取、剪貼簿） */
export type GraphSnapshot = {
  meta: BoothMeta
  nodes: FlowNode[]
  edges: Edge[]
}

const MAX_HISTORY = 60

let past: GraphSnapshot[] = []
let future: GraphSnapshot[] = []

/** 文字／meta 連續編輯：先記住「編輯前」快照，閒置後再入棧 */
let pendingBefore: GraphSnapshot | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function takeSnapshot(
  meta: BoothMeta,
  nodes: FlowNode[],
  edges: Edge[],
): GraphSnapshot {
  return {
    meta: structuredClone(meta),
    nodes: structuredClone(nodes),
    edges: structuredClone(edges),
  }
}

export function clearHistory() {
  past = []
  future = []
  pendingBefore = null
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

export function canUndo() {
  return past.length > 0 || pendingBefore != null
}

export function canRedo() {
  return future.length > 0
}

/** 結構性變更前立刻入棧（連線、刪除、貼上等） */
export function commitNow(snapshot: GraphSnapshot) {
  flushPending()
  past.push(snapshot)
  if (past.length > MAX_HISTORY) past.shift()
  future = []
}

/**
 * 連續輸入用：第一次呼叫記下 before，之後 debounce 結束才入棧。
 * 呼叫端應在「變更前」傳入當下快照。
 */
export function commitDebounced(before: GraphSnapshot, delayMs = 450) {
  if (!pendingBefore) {
    pendingBefore = before
  }
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    flushPending()
  }, delayMs)
}

export function flushPending() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (pendingBefore) {
    past.push(pendingBefore)
    if (past.length > MAX_HISTORY) past.shift()
    future = []
    pendingBefore = null
  }
}

export function undo(
  current: GraphSnapshot,
): GraphSnapshot | null {
  flushPending()
  const prev = past.pop()
  if (!prev) return null
  future.push(current)
  return prev
}

export function redo(
  current: GraphSnapshot,
): GraphSnapshot | null {
  flushPending()
  const next = future.pop()
  if (!next) return null
  past.push(current)
  return next
}

/** 測試用：讀取堆疊長度 */
export function historyDepth() {
  return { past: past.length, future: future.length, pending: pendingBefore != null }
}
