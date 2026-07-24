import type { Edge, Node } from '@xyflow/react'
import {
  CHOICE_LETTERS,
  normalizeBoothId,
  type BoothMeta,
  type CsvRow,
  type DialogueNodeData,
} from './types'

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
    const next: FlowNode | null =
      childrenOf(cursor.id, edges, nodesById)[0] ?? null
    cursor = next
  }

  const choiceMenu =
    !cycle && cursor && dataOf(cursor).kind === 'choiceMenu' ? cursor : null

  return { messages, choiceMenu, cycle }
}

/**
 * 沿分支往下走。若接到「已屬於他處」的節點（開場、選單、其他分支內容），記為 jump（CSV 的 *_Goto）。
 * claimedIds：開場訊息 + 先前分支已匯出的內容／連結／選項節點。
 */
function walkLinearBranch(
  start: FlowNode,
  edges: FlowEdge[],
  nodesById: Map<string, FlowNode>,
  claimedIds: Set<string>,
  menuId: string | null,
): {
  messages: FlowNode[]
  url: FlowNode | null
  end: FlowNode | null
  /** 跳到既有對話／選單（非本分支獨有內容） */
  jump: FlowNode | null
  cycle: boolean
  visited: Set<string>
} {
  const messages: FlowNode[] = []
  const visited = new Set<string>()
  let url: FlowNode | null = null
  let end: FlowNode | null = null
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

    // 接到選單／已匯出節點 → Goto，不重複寫入 Content
    if (kind === 'choiceMenu' || (menuId && cursor.id === menuId)) {
      jump = cursor
      break
    }
    if (claimedIds.has(cursor.id)) {
      jump = cursor
      break
    }

    if (kind === 'message') {
      messages.push(cursor)
      cursor = childrenOf(cursor.id, edges, nodesById)[0] ?? null
      continue
    }
    if (kind === 'url') {
      url = cursor
      cursor = childrenOf(cursor.id, edges, nodesById)[0] ?? null
      continue
    }
    if (kind === 'end') {
      end = cursor
      break
    }
    // 接到其他 choice 等：視為跳轉
    if (kind === 'choice') {
      jump = cursor
      break
    }
    break
  }

  return { messages, url, end, jump, cycle, visited }
}

/** 從開場主幹與各選項分支收集可匯出的節點 id */
export function collectExportableIds(
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
  const openingIds = new Set(messages.map((m) => m.id))

  for (const m of messages) ids.add(m.id)
  if (!choiceMenu) return { ids, cycle }

  ids.add(choiceMenu.id)
  const claimedIds = new Set(openingIds)
  const choiceEdges = edges.filter((e) => e.source === choiceMenu.id)

  for (const edge of choiceEdges) {
    const choiceNode = nodesById.get(edge.target)
    if (!choiceNode) continue
    ids.add(choiceNode.id)
    claimedIds.add(choiceNode.id)
    const branch = walkLinearBranch(
      choiceNode,
      edges,
      nodesById,
      claimedIds,
      choiceMenu.id,
    )
    if (branch.cycle) cycle = true
    for (const id of branch.visited) ids.add(id)
    if (branch.jump) ids.add(branch.jump.id)
    for (const m of branch.messages) claimedIds.add(m.id)
    if (branch.url) claimedIds.add(branch.url.id)
  }

  return { ids, cycle }
}

function buildNodeKeyMap(
  booth: string,
  messages: FlowNode[],
  choiceMenu: FlowNode | null,
  edges: FlowEdge[],
  nodesById: Map<string, FlowNode>,
): Map<string, string> {
  const map = new Map<string, string>()
  messages.forEach((node, i) => {
    map.set(node.id, `${booth}_Msg${String(i + 1).padStart(2, '0')}`)
  })
  if (choiceMenu) {
    map.set(choiceMenu.id, 'MENU')
    const claimedIds = new Set(messages.map((m) => m.id))
    const choiceEdges = edges
      .filter((e) => e.source === choiceMenu.id)
      .sort((a, b) =>
        (a.sourceHandle ?? a.id).localeCompare(b.sourceHandle ?? b.id),
      )
    const used = new Set<string>()
    choiceEdges.forEach((edge, index) => {
      const choiceNode = nodesById.get(edge.target)
      if (!choiceNode || dataOf(choiceNode).kind !== 'choice') return
      const fromHandle = edge.sourceHandle?.match(/^opt-([A-F])$/i)?.[1]
      const letter =
        (fromHandle?.toUpperCase() as (typeof CHOICE_LETTERS)[number] | undefined) ??
        CHOICE_LETTERS.find((l) => !used.has(l)) ??
        CHOICE_LETTERS[index]
      if (!letter || used.has(letter)) return
      used.add(letter)
      map.set(choiceNode.id, `${booth}_${letter}_Name`)
      claimedIds.add(choiceNode.id)
      const branch = walkLinearBranch(
        choiceNode,
        edges,
        nodesById,
        claimedIds,
        choiceMenu.id,
      )
      branch.messages.forEach((msg, i) => {
        map.set(
          msg.id,
          `${booth}_${letter}_Content${String(i + 1).padStart(2, '0')}`,
        )
        claimedIds.add(msg.id)
      })
      if (branch.url) {
        map.set(branch.url.id, `${booth}_${letter}_URL`)
        claimedIds.add(branch.url.id)
      }
    })
  }
  return map
}

/** 將流程圖轉成範本用的 CSV 列（編號／說明／zh_TW／備註） */
export function flowToCsvRows(
  meta: BoothMeta,
  nodes: FlowNode[],
  edges: FlowEdge[],
): CsvRow[] {
  const booth = normalizeBoothId(meta.boothId)
  const nodesById = new Map(nodes.map((n) => [n.id, n]))
  const rows: CsvRow[] = []

  const { messages, choiceMenu } = findStartMessages(nodes, edges)
  const keyMap = buildNodeKeyMap(booth, messages, choiceMenu, edges, nodesById)

  messages.forEach((node, i) => {
    const n = i + 1
    const d = dataOf(node)
    rows.push({
      id: `${booth}_Msg${String(n).padStart(2, '0')}`,
      description: d.title || `${booth}攤位對話${String(n).padStart(2, '0')}`,
      zh_TW: d.text,
      note: d.note,
    })
  })

  if (!choiceMenu) {
    return rows
  }

  const claimedIds = new Set(messages.map((m) => m.id))
  const choiceEdges = edges
    .filter((e) => e.source === choiceMenu.id)
    .sort((a, b) => {
      const ao = a.sourceHandle ?? a.id
      const bo = b.sourceHandle ?? b.id
      return ao.localeCompare(bo)
    })

  const usedLetters = new Set<string>()

  choiceEdges.forEach((edge, index) => {
    const choiceNode = nodesById.get(edge.target)
    if (!choiceNode || dataOf(choiceNode).kind !== 'choice') return

    const fromHandle = edge.sourceHandle?.match(/^opt-([A-F])$/i)?.[1]
    const letter =
      (fromHandle?.toUpperCase() as (typeof CHOICE_LETTERS)[number] | undefined) ??
      CHOICE_LETTERS.find((l) => !usedLetters.has(l)) ??
      CHOICE_LETTERS[index]
    if (!letter || usedLetters.has(letter)) return
    usedLetters.add(letter)

    const d = dataOf(choiceNode)
    rows.push({
      id: `${booth}_${letter}_Name`,
      description: `選項${letter}文字`,
      zh_TW: d.text,
      note: d.note,
    })
    claimedIds.add(choiceNode.id)

    const branch = walkLinearBranch(
      choiceNode,
      edges,
      nodesById,
      claimedIds,
      choiceMenu.id,
    )
    branch.messages.forEach((msg, i) => {
      const md = dataOf(msg)
      const n = i + 1
      rows.push({
        id: `${booth}_${letter}_Content${String(n).padStart(2, '0')}`,
        description: `選項${letter}內容${String(n).padStart(2, '0')}`,
        zh_TW: md.text,
        note: md.note,
      })
      claimedIds.add(msg.id)
    })

    if (branch.url) {
      const ud = dataOf(branch.url)
      rows.push({
        id: `${booth}_${letter}_URL`,
        description: `選項${letter}連結`,
        zh_TW: ud.text,
        note: ud.note,
      })
      claimedIds.add(branch.url.id)
    }

    if (branch.jump) {
      const targetKey =
        keyMap.get(branch.jump.id) ??
        (dataOf(branch.jump).kind === 'choiceMenu' ? 'MENU' : branch.jump.id)
      rows.push({
        id: `${booth}_${letter}_Goto`,
        description: `選項${letter}跳轉`,
        zh_TW: targetKey,
        note: '接到既有對話／選單（非結束）。MENU＝回到選項選單',
      })
    }
  })

  return rows
}

export function csvRowsToString(
  rows: CsvRow[],
  locale = 'zh_TW',
  includeHeader = true,
  withBom = false,
): string {
  const escape = (value: string) => {
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  const lines: string[] = []
  if (includeHeader) {
    lines.push(['編號', '說明', locale, '備註'].map(escape).join(','))
  }
  for (const row of rows) {
    lines.push(
      [row.id, row.description, row.zh_TW, row.note].map(escape).join(','),
    )
  }
  const body = lines.join('\n') + '\n'
  return withBom ? `\uFEFF${body}` : body
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
