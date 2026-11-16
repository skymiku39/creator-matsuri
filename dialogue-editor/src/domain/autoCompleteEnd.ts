import type { Edge } from '@xyflow/react'
import type { FlowNode } from './flowGraph'
import { defaultEndAction, isLeaveChoice } from './endAction'
import { nextId } from '../store/idFactory'

/**
 * 為缺少結束節點的分支自動補上 end，並明確寫入行為：
 * - 離開選項（如：等一下再過來）：結束對話
 * - 其他選項：回到選單
 */
export function autoCompleteEndNodes(
  nodes: FlowNode[],
  edges: Edge[],
): { nodes: FlowNode[]; edges: Edge[]; added: number } {
  const nodesById = new Map(nodes.map((n) => [n.id, n]))
  const outMap = new Map<string, Edge[]>()
  for (const e of edges) {
    const list = outMap.get(e.source) ?? []
    list.push(e)
    outMap.set(e.source, list)
  }

  const menus = nodes.filter((n) => n.data.kind === 'choiceMenu')
  const nextNodes = [...nodes]
  const nextEdges = [...edges]
  let added = 0

  for (const menu of menus) {
    const choiceEdges = (outMap.get(menu.id) ?? []).filter((e) => {
      const t = nodesById.get(e.target)
      return t?.data.kind === 'choice'
    })

    for (const ce of choiceEdges) {
      const choice = nodesById.get(ce.target)
      if (!choice) continue

      const tip = findBranchTip(choice.id, nodesById, outMap)
      if (!tip) continue
      if (tip.data.kind === 'end') continue

      const leave = isLeaveChoice(choice)

      // 一般選項還沒寫任何內容時先不補，等有對話／連結再補
      if (!leave && tip.data.kind !== 'message' && tip.data.kind !== 'url') {
        continue
      }

      // 若 tip 已有出邊，不覆蓋
      if ((outMap.get(tip.id) ?? []).length > 0) continue

      const endId = nextId('end')
      const endNode: FlowNode = {
        id: endId,
        type: 'end',
        position: {
          x: tip.position.x,
          y: tip.position.y + 120,
        },
        data: {
          kind: 'end',
          title: '',
          text: '',
          note: '自動補全',
          endAction: defaultEndAction(choice),
        },
      }
      const edge: Edge = {
        id: nextId('e'),
        source: tip.id,
        target: endId,
      }
      nextNodes.push(endNode)
      nextEdges.push(edge)
      nodesById.set(endId, endNode)
      outMap.set(tip.id, [edge])
      added += 1
    }
  }

  return { nodes: nextNodes, edges: nextEdges, added }
}

/** 從選項沿第一條出邊走到分支最後一個節點 */
export function findBranchTip(
  startId: string,
  nodesById: Map<string, FlowNode>,
  outMap: Map<string, Edge[]>,
): FlowNode | null {
  let cursor = nodesById.get(startId) ?? null
  const visited = new Set<string>()
  while (cursor) {
    if (visited.has(cursor.id)) return cursor
    visited.add(cursor.id)
    const outs = outMap.get(cursor.id) ?? []
    if (outs.length === 0) return cursor
    const next = nodesById.get(outs[0].target)
    if (!next) return cursor
    cursor = next
  }
  return null
}
