import type { FlowEdge, FlowNode } from './flowGraph'
import { collectReachableIds, findStartMessages } from './flowGraph'
import { looksLikeReturnChoice, type DialogueNodeData } from './types'

export interface ValidationIssue {
  level: 'error' | 'warn'
  message: string
  nodeId?: string
}

function dataOf(n: FlowNode): DialogueNodeData {
  return n.data
}

const ALLOWED: Record<string, Set<string>> = {
  message: new Set(['message', 'choiceMenu', 'url', 'end']),
  choiceMenu: new Set(['choice']),
  choice: new Set(['message', 'url', 'end']),
  url: new Set(['message', 'url', 'end']),
  end: new Set(),
}

export function validateFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const nodesById = new Map(nodes.map((n) => [n.id, n]))
  const messages = nodes.filter((n) => dataOf(n).kind === 'message')
  const menus = nodes.filter((n) => dataOf(n).kind === 'choiceMenu')
  const choices = nodes.filter((n) => dataOf(n).kind === 'choice')

  if (messages.length === 0) {
    issues.push({ level: 'warn', message: '尚未新增任何對話訊息節點' })
  }

  for (const m of messages) {
    if (!dataOf(m).text.trim()) {
      issues.push({
        level: 'error',
        message: `訊息節點「${dataOf(m).title || m.id}」台詞為空`,
        nodeId: m.id,
      })
    }
  }

  // 非選單節點：出邊超過 1 條會讓匯出只取第一條
  for (const n of nodes) {
    if (dataOf(n).kind === 'choiceMenu') continue
    const outs = edges.filter((e) => e.source === n.id)
    if (outs.length > 1) {
      issues.push({
        level: 'error',
        message: `節點「${dataOf(n).title || n.id}」有多條出邊，匯出只會走第一條`,
        nodeId: n.id,
      })
    }
  }

  // 連線類型
  for (const e of edges) {
    const src = nodesById.get(e.source)
    const tgt = nodesById.get(e.target)
    if (!src || !tgt) {
      issues.push({
        level: 'error',
        message: `連線 ${e.id} 指向不存在的節點`,
      })
      continue
    }
    const allowed = ALLOWED[dataOf(src).kind]
    if (allowed && !allowed.has(dataOf(tgt).kind)) {
      issues.push({
        level: 'error',
        message: `不合法連線：${dataOf(src).kind} → ${dataOf(tgt).kind}`,
        nodeId: src.id,
      })
    }
  }

  if (menus.length > 1) {
    issues.push({
      level: 'warn',
      message: '偵測到多個選項選單；匯出時僅會使用開場後的第一個選單',
    })
  }

  if (menus.length >= 1) {
    const { choiceMenu } = findStartMessages(nodes, edges)
    const menu = choiceMenu ?? menus[0]
    const menuId = menu.id
    const outs = edges.filter((e) => e.source === menuId)

    if (outs.length === 0) {
      issues.push({
        level: 'error',
        message: '選項選單尚未連接任何選項',
        nodeId: menuId,
      })
    }
    if (outs.length > 0 && outs.length < 2) {
      issues.push({
        level: 'warn',
        message: '選項少於 2 個，RPGMV 選項指令通常至少需要兩個選項',
        nodeId: menuId,
      })
    }

    const handleSeen = new Set<string>()
    for (const e of outs) {
      const tgt = nodesById.get(e.target)
      if (tgt && dataOf(tgt).kind !== 'choice') {
        issues.push({
          level: 'error',
          message: '選單的出邊必須連到「選項」節點',
          nodeId: menuId,
        })
      }
      const handle = e.sourceHandle ?? ''
      if (!handle || !/^opt-[A-F]$/.test(handle)) {
        issues.push({
          level: 'error',
          message: '選單出邊必須從 opt-A～F 的連線點拉出',
          nodeId: menuId,
        })
      } else if (handleSeen.has(handle)) {
        issues.push({
          level: 'error',
          message: `選項 handle「${handle}」重複使用`,
          nodeId: menuId,
        })
      } else {
        handleSeen.add(handle)
      }
    }

    const hasReturn = choices.some((c) => {
      const d = dataOf(c)
      return d.isReturn || looksLikeReturnChoice(d.text, d.note)
    })
    if (outs.length > 0 && !hasReturn) {
      issues.push({
        level: 'warn',
        message:
          '建議至少保留一個「返回／稍後再來」選項（範本要求每個選單含返回）',
        nodeId: menuId,
      })
    }
  }

  for (const c of choices) {
    if (!dataOf(c).text.trim()) {
      issues.push({
        level: 'error',
        message: `選項節點「${dataOf(c).title || c.id}」文字為空`,
        nodeId: c.id,
      })
    }
  }

  const urls = nodes.filter((n) => dataOf(n).kind === 'url')
  for (const u of urls) {
    const t = dataOf(u).text.trim()
    if (!t) {
      issues.push({
        level: 'error',
        message: `連結節點 ${u.id} 的 URL 為空`,
        nodeId: u.id,
      })
    } else if (!/^https?:\/\//i.test(t)) {
      issues.push({
        level: 'warn',
        message: `連結「${t}」看起來不像 http(s) URL`,
        nodeId: u.id,
      })
    }
  }

  const { ids: reachable, cycle } = collectReachableIds(nodes, edges)
  if (cycle) {
    issues.push({
      level: 'error',
      message: '流程存在循環連線，請先打斷循環',
    })
  }

  for (const n of nodes) {
    const kind = dataOf(n).kind
    if (kind === 'end') continue
    if (!reachable.has(n.id)) {
      issues.push({
        level: 'error',
        message: `節點「${dataOf(n).title || dataOf(n).text || n.id}」未連上主幹，模擬時不會走到`,
        nodeId: n.id,
      })
    }
  }

  return issues
}
