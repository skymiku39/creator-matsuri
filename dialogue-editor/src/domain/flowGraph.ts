import type { Edge, Node } from '@xyflow/react'
import type { DialogueNodeData } from './types'

export type FlowNode = Node<DialogueNodeData>
export type FlowEdge = Edge

function dataOf(node: FlowNode): DialogueNodeData {
  return node.data
}

function childrenOf(
  nodeId: string,
  edges: FlowEdge[],
  nodesById: Map<string, FlowNode>,
): FlowNode[] {
  return edges
    .filter((e) => e.source === nodeId)
    .sort((a, b) => {
      const ao = a.sourceHandle ?? a.id
      const bo = b.sourceHandle ?? b.id
      return ao.localeCompare(bo)
    })
    .map((e) => nodesById.get(e.target))
    .filter((n): n is FlowNode => Boolean(n))
}

/** 找出開場訊息序列與選單 */
export function findStartMessages(
  nodes: FlowNode[],
  edges: FlowEdge[],
): { messages: FlowNode[]; choiceMenu: FlowNode | null; cycle: boolean } {
  const nodesById = new Map(nodes.map((n) => [n.id, n]))
  const targets = new Set(edges.map((e) => e.target))
  const roots = nodes.filter((n) => !targets.has(n.id))

  const start =
    roots.find((n) => dataOf(n).kind === 'message') ??
    roots.find((n) => dataOf(n).kind === 'choiceMenu') ??
    nodes.find((n) => dataOf(n).kind === 'message') ??
    null

  if (!start) {
    return { messages: [], choiceMenu: null, cycle: false }
  }

  const messages: FlowNode[] = []
  const visited = new Set<string>()
  let cursor: FlowNode | null = start
  let cycle = false

  while (cursor && dataOf(cursor).kind === 'message') {
    if (visited.has(cursor.id)) {
      cycle = true
      break
    }
    visited.add(cursor.id)
    messages.push(cursor)
    cursor = childrenOf(cursor.id, edges, nodesById)[0] ?? null
  }

  const choiceMenu =
    !cycle && cursor && dataOf(cursor).kind === 'choiceMenu' ? cursor : null

  return { messages, choiceMenu, cycle }
}

function walkBranch(
  start: FlowNode,
  edges: FlowEdge[],
  nodesById: Map<string, FlowNode>,
  claimedIds: Set<string>,
  menuId: string | null,
): { cycle: boolean; visited: Set<string>; jump: FlowNode | null } {
  const visited = new Set<string>()
  let jump: FlowNode | null = null
  let cursor: FlowNode | null = start
  let cycle = false

  if (dataOf(cursor).kind === 'choice') {
    visited.add(cursor.id)
    cursor = childrenOf(cursor.id, edges, nodesById)[0] ?? null
  }

  while (cursor) {
    if (visited.has(cursor.id)) {
      cycle = true
      break
    }
    visited.add(cursor.id)
    const kind = dataOf(cursor).kind

    if (kind === 'choiceMenu' || (menuId && cursor.id === menuId)) {
      jump = cursor
      break
    }
    if (claimedIds.has(cursor.id)) {
      jump = cursor
      break
    }
    if (kind === 'message' || kind === 'url') {
      cursor = childrenOf(cursor.id, edges, nodesById)[0] ?? null
      continue
    }
    if (kind === 'end') break
    if (kind === 'choice') {
      jump = cursor
      break
    }
    break
  }

  return { cycle, visited, jump }
}

/** 從開場主幹與各選項分支收集可到達的節點 id（供驗證孤立節點） */
export function collectReachableIds(
  nodes: FlowNode[],
  edges: FlowEdge[],
): { ids: Set<string>; cycle: boolean } {
  const nodesById = new Map(nodes.map((n) => [n.id, n]))
  const ids = new Set<string>()
  const { messages, choiceMenu, cycle: openCycle } = findStartMessages(
    nodes,
    edges,
  )
  let cycle = openCycle
  const claimedIds = new Set(messages.map((m) => m.id))

  for (const m of messages) ids.add(m.id)
  if (!choiceMenu) return { ids, cycle }

  ids.add(choiceMenu.id)
  for (const edge of edges.filter((e) => e.source === choiceMenu.id)) {
    const choiceNode = nodesById.get(edge.target)
    if (!choiceNode) continue
    ids.add(choiceNode.id)
    claimedIds.add(choiceNode.id)
    const branch = walkBranch(
      choiceNode,
      edges,
      nodesById,
      claimedIds,
      choiceMenu.id,
    )
    if (branch.cycle) cycle = true
    for (const id of branch.visited) {
      ids.add(id)
      claimedIds.add(id)
    }
    if (branch.jump) ids.add(branch.jump.id)
  }

  return { ids, cycle }
}
