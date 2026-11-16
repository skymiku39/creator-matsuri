import type { Edge } from '@xyflow/react'
import type { FlowNode } from './flowGraph'
import { looksLikeReturnChoice, type EndAction } from './types'

/** 結束節點行為的顯示文字 */
export const END_ACTION_LABEL: Record<EndAction, string> = {
  menu: '回到選單',
  finish: '結束對話',
}

/** 舊版或自動產生的標題；顯示時改用行為文字，避免與實際行為矛盾 */
const AUTO_END_TITLES = new Set([
  '',
  '結束',
  '結束／返回',
  ...Object.values(END_ACTION_LABEL),
])

/** 是否為「離開對話」類選項（如：等一下再過來） */
export function isLeaveChoice(choice: FlowNode | null | undefined): boolean {
  if (!choice || choice.data.kind !== 'choice') return false
  return (
    Boolean(choice.data.isReturn) ||
    looksLikeReturnChoice(choice.data.text, choice.data.note)
  )
}

/** 沿入邊往上找最近的選項節點（含自己） */
export function findParentChoice(
  node: FlowNode,
  nodesById: Map<string, FlowNode>,
  edges: Edge[],
): FlowNode | null {
  let cursor: FlowNode | null = node
  const visited = new Set<string>()
  while (cursor) {
    if (visited.has(cursor.id)) break
    visited.add(cursor.id)
    if (cursor.data.kind === 'choice') return cursor
    const inbound = edges.find((e) => e.target === cursor!.id)
    if (!inbound) break
    cursor = nodesById.get(inbound.source) ?? null
  }
  return null
}

/**
 * 未明確指定時的預設行為：
 * 一般選項講完回到選單，離開選項（或不在任何選項之下）則結束對話。
 */
export function defaultEndAction(parentChoice: FlowNode | null): EndAction {
  return parentChoice && !isLeaveChoice(parentChoice) ? 'menu' : 'finish'
}

/**
 * 分支走到盡頭時該做什麼。
 * `tip` 可以是結束節點，也可以是沒有後繼的最後一個節點。
 */
export function resolveEndAction(
  tip: FlowNode,
  nodesById: Map<string, FlowNode>,
  edges: Edge[],
): EndAction {
  if (tip.data.kind === 'end') {
    const explicit = tip.data.endAction
    if (explicit === 'menu' || explicit === 'finish') return explicit
  }
  return defaultEndAction(findParentChoice(tip, nodesById, edges))
}

/** 供畫布節點使用：以節點 id 解析行為 */
export function resolveEndActionById(
  nodeId: string,
  nodes: FlowNode[],
  edges: Edge[],
): EndAction {
  const nodesById = new Map(nodes.map((n) => [n.id, n]))
  const node = nodesById.get(nodeId)
  if (!node) return 'finish'
  return resolveEndAction(node, nodesById, edges)
}

/** 結束節點顯示用標題：自訂標題優先，否則顯示行為 */
export function endDisplayTitle(title: string, action: EndAction): string {
  const t = title.trim()
  return AUTO_END_TITLES.has(t) ? END_ACTION_LABEL[action] : t
}
