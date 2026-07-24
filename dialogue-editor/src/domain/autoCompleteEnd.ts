import type { Edge } from '@xyflow/react'
import type { FlowNode } from './exportCsv'
import { looksLikeReturnChoice } from './types'
import { nextId } from '../store/idFactory'

/**
 * 為缺少結束節點的分支自動補上 end。
 * - 返回選項：若末端不是 end，接上 end
 * - 其他分支：若末端是 message／url 且無出邊，也接上 end（方便模擬結束）
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
  let nextNodes = [...nodes]
  let nextEdges = [...edges]
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

      const isReturn =
        Boolean(choice.data.isReturn) ||
        looksLikeReturnChoice(choice.data.text, choice.data.note)

      // 非返回且末端還有未走完的感覺：仍補 end，模擬可結束該分支
      if (!isReturn && tip.data.kind !== 'message' && tip.data.kind !== 'url') {
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
          title: isReturn ? '結束／返回' : '結束',
          text: '',
          note: isReturn ? '自動補全：返回選單' : '自動補全：分支結束',
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

function findBranchTip(
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
