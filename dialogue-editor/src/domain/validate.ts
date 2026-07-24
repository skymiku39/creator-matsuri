import type { FlowEdge, FlowNode } from './exportCsv'
import type { DialogueNodeData } from './types'

export interface ValidationIssue {
  level: 'error' | 'warn'
  message: string
}

function dataOf(n: FlowNode): DialogueNodeData {
  return n.data
}

export function validateFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
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
      })
    }
  }

  if (menus.length > 1) {
    issues.push({
      level: 'warn',
      message: '偵測到多個選項選單；匯出時僅會使用開場後的第一個選單',
    })
  }

  if (menus.length === 1) {
    const menuId = menus[0].id
    const outs = edges.filter((e) => e.source === menuId)
    if (outs.length === 0) {
      issues.push({ level: 'error', message: '選項選單尚未連接任何選項' })
    }
    if (outs.length > 0 && outs.length < 2) {
      issues.push({
        level: 'warn',
        message: '選項少於 2 個，RPGMV 選項指令通常至少需要兩個選項',
      })
    }

    const hasReturn = choices.some((c) => {
      const d = dataOf(c)
      return (
        d.isReturn ||
        /返回|再說|等一下|離開|再見/.test(d.text) ||
        d.note.includes('返回')
      )
    })
    if (choices.length > 0 && !hasReturn) {
      issues.push({
        level: 'warn',
        message:
          '建議至少保留一個「返回／稍後再來」選項（範本要求每個選單含返回）',
      })
    }
  }

  for (const c of choices) {
    if (!dataOf(c).text.trim()) {
      issues.push({
        level: 'error',
        message: `選項節點「${dataOf(c).title || c.id}」文字為空`,
      })
    }
  }

  const urls = nodes.filter((n) => dataOf(n).kind === 'url')
  for (const u of urls) {
    const t = dataOf(u).text.trim()
    if (!t) {
      issues.push({ level: 'error', message: `連結節點 ${u.id} 的 URL 為空` })
    } else if (!/^https?:\/\//i.test(t)) {
      issues.push({
        level: 'warn',
        message: `連結「${t}」看起來不像 http(s) URL`,
      })
    }
  }

  return issues
}
