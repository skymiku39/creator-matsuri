import type { Edge } from '@xyflow/react'
import {
  findStartMessages,
  type FlowNode,
} from './flowGraph'
import { isLeaveChoice, resolveEndAction } from './endAction'

export type SimPhase =
  | {
      type: 'message'
      nodeId: string
      text: string
      note: string
      /** 點擊後進入下一狀態 */
    }
  | {
      type: 'choices'
      menuId: string
      options: {
        choiceId: string
        letter: string
        text: string
        isReturn: boolean
      }[]
    }
  | {
      type: 'url'
      nodeId: string
      url: string
      note: string
    }
  | {
      type: 'finished'
      reason: 'end' | 'empty'
    }

function childrenOf(
  nodeId: string,
  edges: Edge[],
  nodesById: Map<string, FlowNode>,
): FlowNode[] {
  return edges
    .filter((e) => e.source === nodeId)
    .sort((a, b) =>
      (a.sourceHandle ?? a.id).localeCompare(b.sourceHandle ?? b.id),
    )
    .map((e) => nodesById.get(e.target))
    .filter((n): n is FlowNode => Boolean(n))
}

function edgeToChoice(
  edge: Edge,
  nodesById: Map<string, FlowNode>,
): SimPhase & { type: 'choices' } extends never
  ? never
  : {
      choiceId: string
      letter: string
      text: string
      isReturn: boolean
    } | null {
  const choice = nodesById.get(edge.target)
  if (!choice || choice.data.kind !== 'choice') return null
  const letter =
    edge.sourceHandle?.match(/^opt-([A-F])$/i)?.[1]?.toUpperCase() ?? '?'
  return {
    choiceId: choice.id,
    letter,
    text: choice.data.text,
    isReturn: isLeaveChoice(choice),
  }
}

/** 建立模擬初始狀態（開場第一句或選單） */
export function createSimulation(
  nodes: FlowNode[],
  edges: Edge[],
): SimPhase {
  const { messages, choiceMenu } = findStartMessages(nodes, edges)
  if (messages.length > 0) {
    const m = messages[0]
    return {
      type: 'message',
      nodeId: m.id,
      text: m.data.text,
      note: m.data.note,
    }
  }
  if (choiceMenu) {
    return buildChoicesPhase(choiceMenu, edges, new Map(nodes.map((n) => [n.id, n])))
  }
  return { type: 'finished', reason: 'empty' }
}

function buildChoicesPhase(
  menu: FlowNode,
  edges: Edge[],
  nodesById: Map<string, FlowNode>,
): SimPhase {
  const options = edges
    .filter((e) => e.source === menu.id)
    .sort((a, b) =>
      (a.sourceHandle ?? a.id).localeCompare(b.sourceHandle ?? b.id),
    )
    .map((e) => edgeToChoice(e, nodesById))
    .filter((o): o is NonNullable<typeof o> => Boolean(o))

  return {
    type: 'choices',
    menuId: menu.id,
    options,
  }
}

/**
 * 推進模擬。
 * - message：進下一句／選單／url／結束
 * - choices：選擇後進入該分支第一個內容
 * - url：繼續往下或回選單／結束
 * - 結束節點：endAction 為 menu 回到選單，finish 結束對話
 */
export function advanceSimulation(
  phase: SimPhase,
  nodes: FlowNode[],
  edges: Edge[],
  choiceId?: string,
): SimPhase {
  const nodesById = new Map(nodes.map((n) => [n.id, n]))
  const { messages, choiceMenu } = findStartMessages(nodes, edges)

  if (phase.type === 'finished') return phase

  if (phase.type === 'choices') {
    if (!choiceId) return phase
    const choice = nodesById.get(choiceId)
    if (!choice) return phase
    return nextAfter(choice, nodesById, edges, messages, choiceMenu, true)
  }

  if (phase.type === 'message' || phase.type === 'url') {
    const current = nodesById.get(phase.nodeId)
    if (!current) return { type: 'finished', reason: 'empty' }
    return nextAfter(current, nodesById, edges, messages, choiceMenu, false)
  }

  return phase
}

function nextAfter(
  current: FlowNode,
  nodesById: Map<string, FlowNode>,
  edges: Edge[],
  openingMessages: FlowNode[],
  choiceMenu: FlowNode | null,
  fromChoiceNode: boolean,
): SimPhase {
  // 從 choice 本身開始：跳過 choice，看第一個子節點
  let cursor: FlowNode | null = current
  if (fromChoiceNode && current.data.kind === 'choice') {
    cursor = childrenOf(current.id, edges, nodesById)[0] ?? null
  } else if (!fromChoiceNode) {
    cursor = childrenOf(current.id, edges, nodesById)[0] ?? null
  }

  if (!cursor) {
    // 開場訊息序列中的下一句
    if (current.data.kind === 'message') {
      const idx = openingMessages.findIndex((m) => m.id === current.id)
      if (idx >= 0 && idx < openingMessages.length - 1) {
        const m = openingMessages[idx + 1]
        return {
          type: 'message',
          nodeId: m.id,
          text: m.data.text,
          note: m.data.note,
        }
      }
      if (idx >= 0 && choiceMenu) {
        return buildChoicesPhase(choiceMenu, edges, nodesById)
      }
    }
    // 分支沒有接結束節點：比照結束節點的預設行為
    return endOfBranch(current, nodesById, edges, choiceMenu)
  }

  if (cursor.data.kind === 'message') {
    return {
      type: 'message',
      nodeId: cursor.id,
      text: cursor.data.text,
      note: cursor.data.note,
    }
  }
  if (cursor.data.kind === 'url') {
    return {
      type: 'url',
      nodeId: cursor.id,
      url: cursor.data.text,
      note: cursor.data.note,
    }
  }
  if (cursor.data.kind === 'choiceMenu') {
    return buildChoicesPhase(cursor, edges, nodesById)
  }
  if (cursor.data.kind === 'end') {
    return endOfBranch(cursor, nodesById, edges, choiceMenu)
  }
  if (cursor.data.kind === 'choice') {
    return nextAfter(cursor, nodesById, edges, openingMessages, choiceMenu, true)
  }

  return { type: 'finished', reason: 'end' }
}

/**
 * 分支走到盡頭：依結束節點的行為回到選單或結束對話。
 * `tip` 為結束節點，或沒有後繼的最後一個節點。
 */
function endOfBranch(
  tip: FlowNode,
  nodesById: Map<string, FlowNode>,
  edges: Edge[],
  choiceMenu: FlowNode | null,
): SimPhase {
  if (choiceMenu && resolveEndAction(tip, nodesById, edges) === 'menu') {
    return buildChoicesPhase(choiceMenu, edges, nodesById)
  }
  return { type: 'finished', reason: 'end' }
}

/** 選擇選項後進入分支 */
export function pickChoice(
  phase: SimPhase,
  nodes: FlowNode[],
  edges: Edge[],
  choiceId: string,
): SimPhase {
  if (phase.type !== 'choices') return phase
  return advanceSimulation(phase, nodes, edges, choiceId)
}
