import type { Edge } from '@xyflow/react'
import { groupRows, type ParsedTemplate } from './importCsv'
import type { DialogueNodeData } from './types'
import type { FlowNode } from './exportCsv'

let seq = 0
function nid(prefix: string) {
  seq += 1
  return `${prefix}_${seq}`
}

/** 由範本列重建可編輯流程圖 */
export function rowsToFlow(parsed: ParsedTemplate): {
  nodes: FlowNode[]
  edges: Edge[]
} {
  seq = 0
  const { messages, branches } = groupRows(parsed.rows)
  const nodes: FlowNode[] = []
  const edges: Edge[] = []

  const x0 = 80
  const yStep = 110
  let y = 40
  let prevId: string | null = null

  for (const msg of messages) {
    const id = nid('msg')
    nodes.push(makeNode(id, x0, y, {
      kind: 'message',
      title: msg.description,
      text: msg.zh_TW,
      note: msg.note,
    }))
    if (prevId) {
      edges.push({ id: nid('e'), source: prevId, target: id })
    }
    prevId = id
    y += yStep
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
  if (prevId) {
    edges.push({ id: nid('e'), source: prevId, target: menuId })
  }

  branches.forEach((branch, bi) => {
    const bx = 420 + bi * 280
    let by = 40
    const choiceId = nid('choice')
    const nameText = branch.name?.zh_TW ?? `選項${branch.letter}`
    const isReturn =
      /返回|再說|等一下|離開|再見/.test(nameText) ||
      Boolean(branch.name?.note.includes('返回'))

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
          note: branch.url.note || '此為超連結',
        }),
      )
      edges.push({ id: nid('e'), source: last, target: id })
      last = id
      by += yStep
    }

    if (isReturn) {
      // 視覺上標示結束／返回：連回選單用虛線語意，匯出時不產生列
      const endId = nid('end')
      nodes.push(
        makeNode(endId, bx, by, {
          kind: 'end',
          title: '結束／返回',
          text: '',
          note: isReturn ? '返回選單或結束對話' : '',
        }),
      )
      edges.push({ id: nid('e'), source: last, target: endId })
    }
  })

  return { nodes, edges }
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
