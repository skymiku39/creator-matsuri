import type { Edge } from '@xyflow/react'
import { groupRows, type ParsedTemplate } from './importCsv'
import { looksLikeReturnChoice, type DialogueNodeData } from './types'
import type { FlowNode } from './exportCsv'

let seq = 0
function nid(prefix: string) {
  seq += 1
  return `${prefix}_${seq}`
}

/** 由範本列重建可編輯流程圖（含 *_Goto 跳轉） */
export function rowsToFlow(parsed: ParsedTemplate): {
  nodes: FlowNode[]
  edges: Edge[]
} {
  seq = 0
  const { messages, branches } = groupRows(parsed.rows)
  const nodes: FlowNode[] = []
  const edges: Edge[] = []

  /** CSV 鍵 → 節點 id，供 Goto 解析 */
  const keyToNodeId = new Map<string, string>()

  const x0 = 80
  const yStep = 110
  let y = 40
  let prevId: string | null = null

  for (const msg of messages) {
    const id = nid('msg')
    nodes.push(
      makeNode(id, x0, y, {
        kind: 'message',
        title: msg.description,
        text: msg.zh_TW,
        note: msg.note,
      }),
    )
    keyToNodeId.set(msg.id.toUpperCase(), id)
    const short = msg.id.replace(/^\d+_/, '')
    keyToNodeId.set(short.toUpperCase(), id)
    if (prevId) {
      edges.push({ id: nid('e'), source: prevId, target: id })
    }
    prevId = id
    y += yStep
  }

  if (branches.length === 0) {
    return { nodes, edges }
  }

  const menuId = nid('menu')
  nodes.push(
    makeNode(menuId, x0, y, {
      kind: 'choiceMenu',
      title: '對話選項',
      text: '',
      note: '每個選項分支建議包含返回選單的選項',
    }),
  )
  keyToNodeId.set('MENU', menuId)
  if (prevId) {
    edges.push({ id: nid('e'), source: prevId, target: menuId })
  }

  type PendingGoto = { fromId: string; targetKey: string }
  const pendingGotos: PendingGoto[] = []

  branches.forEach((branch, bi) => {
    const bx = 420 + bi * 280
    let by = 40
    const choiceId = nid('choice')
    const nameText = branch.name?.zh_TW ?? `選項${branch.letter}`
    const isReturn = looksLikeReturnChoice(nameText, branch.name?.note ?? '')

    nodes.push(
      makeNode(choiceId, bx, by, {
        kind: 'choice',
        title: `選項${branch.letter}`,
        text: nameText,
        note: branch.name?.note ?? '',
        isReturn,
      }),
    )
    edges.push({
      id: nid('e'),
      source: menuId,
      target: choiceId,
      sourceHandle: `opt-${branch.letter}`,
      label: branch.letter,
    })
    by += yStep
    let last = choiceId

    for (const content of branch.contents) {
      const id = nid('msg')
      nodes.push(
        makeNode(id, bx, by, {
          kind: 'message',
          title: content.description,
          text: content.zh_TW,
          note: content.note,
        }),
      )
      keyToNodeId.set(content.id.toUpperCase(), id)
      const short = content.id.replace(/^\d+_/, '')
      keyToNodeId.set(short.toUpperCase(), id)
      edges.push({ id: nid('e'), source: last, target: id })
      last = id
      by += yStep
    }

    if (branch.url) {
      const id = nid('url')
      nodes.push(
        makeNode(id, bx, by, {
          kind: 'url',
          title: branch.url.description,
          text: branch.url.zh_TW,
          note: branch.url.note,
        }),
      )
      keyToNodeId.set(branch.url.id.toUpperCase(), id)
      edges.push({ id: nid('e'), source: last, target: id })
      last = id
      by += yStep
    }

    const gotoKey = branch.goto?.zh_TW?.trim()
    if (gotoKey) {
      pendingGotos.push({ fromId: last, targetKey: gotoKey })
    } else if (isReturn) {
      const endId = nid('end')
      nodes.push(
        makeNode(endId, bx, by, {
          kind: 'end',
          title: '結束／返回',
          text: '',
          note: '',
        }),
      )
      edges.push({ id: nid('e'), source: last, target: endId })
    }
  })

  for (const g of pendingGotos) {
    const targetId = resolveGotoKey(g.targetKey, keyToNodeId)
    if (targetId) {
      edges.push({ id: nid('e'), source: g.fromId, target: targetId })
    }
  }

  return { nodes, edges }
}

function resolveGotoKey(
  raw: string,
  keyToNodeId: Map<string, string>,
): string | null {
  const k = raw.trim().toUpperCase()
  if (keyToNodeId.has(k)) return keyToNodeId.get(k)!
  // 允許只寫 Msg01 / A_Content01
  if (keyToNodeId.has(k.replace(/^\d+_/, ''))) {
    return keyToNodeId.get(k.replace(/^\d+_/, ''))!
  }
  return null
}

function makeNode(
  id: string,
  x: number,
  y: number,
  data: DialogueNodeData,
): FlowNode {
  return {
    id,
    type: data.kind,
    position: { x, y },
    data,
  }
}
