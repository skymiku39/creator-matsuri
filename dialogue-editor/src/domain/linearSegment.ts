import type { Edge } from '@xyflow/react'
import type { FlowNode } from './flowGraph'

function nodesByIdMap(nodes: FlowNode[]) {
  return new Map(nodes.map((n) => [n.id, n]))
}

export function incomingEdges(nodeId: string, edges: Edge[]): Edge[] {
  return edges.filter((e) => e.target === nodeId)
}

export function outgoingEdges(nodeId: string, edges: Edge[]): Edge[] {
  return edges
    .filter((e) => e.source === nodeId)
    .sort((a, b) =>
      (a.sourceHandle ?? a.id).localeCompare(b.sourceHandle ?? b.id),
    )
}

/**
 * 同一條單線對話串上，兩點之間的閉區間（含起點、終點；順序可對調）。
 * 兩點不在同一單線上時回傳 null。
 */
export function linearSegmentInterval(
  fromId: string,
  toId: string,
  nodes: FlowNode[],
  edges: Edge[],
): string[] | null {
  if (fromId === toId) return [fromId]

  let segment = expandLinearSegment(fromId, nodes, edges)
  let i = segment.indexOf(fromId)
  let j = segment.indexOf(toId)

  // 若終點不在「起點那條線」上，改試終點那條線（例如開場↔選單）
  if (j < 0) {
    segment = expandLinearSegment(toId, nodes, edges)
    i = segment.indexOf(fromId)
    j = segment.indexOf(toId)
  }

  if (i < 0 || j < 0) return null
  const lo = Math.min(i, j)
  const hi = Math.max(i, j)
  return segment.slice(lo, hi + 1)
}

/**
 * 以 nodeId 為中心，沿「唯一前驅／唯一後繼」擴展最大線性片段。
 * 碰到選單多出口或分叉／匯合即停；選單本身可作為錨點被納入。
 */
export function expandLinearSegment(
  nodeId: string,
  nodes: FlowNode[],
  edges: Edge[],
): string[] {
  const byId = nodesByIdMap(nodes)
  if (!byId.has(nodeId)) return []

  const ups: string[] = []
  let cursor = nodeId
  const seenUp = new Set<string>([nodeId])
  while (true) {
    const pred = uniquePredecessor(cursor, byId, edges)
    if (!pred || seenUp.has(pred)) break
    seenUp.add(pred)
    ups.push(pred)
    cursor = pred
  }
  ups.reverse()

  const downs: string[] = []
  cursor = nodeId
  const seenDown = new Set<string>([nodeId])
  while (true) {
    const suc = uniqueSuccessor(cursor, byId, edges)
    if (!suc || seenDown.has(suc)) break
    seenDown.add(suc)
    downs.push(suc)
    cursor = suc
  }

  return [...ups, nodeId, ...downs]
}

/** 唯一前驅：自己只有一條入邊，且該前驅對我們是「單一路線」出口 */
function uniquePredecessor(
  nodeId: string,
  byId: Map<string, FlowNode>,
  edges: Edge[],
): string | null {
  const ins = incomingEdges(nodeId, edges)
  if (ins.length !== 1) return null
  const parentId = ins[0].source
  const parent = byId.get(parentId)
  if (!parent) return null
  // 選單有多出口，不納入線性片段
  if (parent.data.kind === 'choiceMenu') return null
  const outs = outgoingEdges(parentId, edges)
  if (outs.length !== 1) return null
  if (outs[0].target !== nodeId) return null
  return parentId
}

/** 唯一後繼：自己只有一條出邊，且該後繼不是「從選單分支出去」的中繼判斷 */
function uniqueSuccessor(
  nodeId: string,
  byId: Map<string, FlowNode>,
  edges: Edge[],
): string | null {
  const node = byId.get(nodeId)
  if (!node) return null
  // 選單本身不往下擴（多選項）
  if (node.data.kind === 'choiceMenu') return null
  const outs = outgoingEdges(nodeId, edges)
  if (outs.length !== 1) return null
  const childId = outs[0].target
  const child = byId.get(childId)
  if (!child) return null
  // 進入選單：開場線性段在選單前結束（不含選單）
  if (child.data.kind === 'choiceMenu') return null
  // 後繼若有多個入邊（匯合），仍可連過去，但後繼再往下會在其入邊數卡住
  return childId
}

export function nodeLabel(node: FlowNode): string {
  const t = node.data.title?.trim()
  const x = node.data.text?.trim()
  if (t) return t
  if (x) return x.length > 24 ? `${x.slice(0, 24)}…` : x
  return node.id
}
