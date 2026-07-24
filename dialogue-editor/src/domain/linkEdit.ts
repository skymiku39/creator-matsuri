import type { Edge } from '@xyflow/react'
import { canConnectKinds } from './connectionRules'
import type { FlowNode } from './flowGraph'
import { CHOICE_LETTERS } from './types'
import { nextId } from '../store/idFactory'

/** 設定節點的唯一前驅（選單→選項時自動配 opt-字母） */
export function setIncomingLink(
  nodeId: string,
  parentId: string | null,
  nodes: FlowNode[],
  edges: Edge[],
): { nodes: FlowNode[]; edges: Edge[]; ok: boolean; reason?: string } {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return { nodes, edges, ok: false, reason: '節點不存在' }

  let next = edges.filter((e) => e.target !== nodeId)
  if (!parentId) return { nodes, edges: next, ok: true }

  const parent = nodes.find((n) => n.id === parentId)
  if (!parent) return { nodes, edges, ok: false, reason: '前驅不存在' }
  if (parentId === nodeId) {
    return { nodes, edges, ok: false, reason: '不能連到自己' }
  }
  if (!canConnectKinds(parent.data.kind, node.data.kind)) {
    return { nodes, edges, ok: false, reason: '這兩種節點不能連接' }
  }

  let sourceHandle: string | null | undefined
  if (parent.data.kind === 'choiceMenu') {
    if (node.data.kind !== 'choice') {
      return { nodes, edges, ok: false, reason: '選單只能接到選項' }
    }
    // 沿用舊邊字母，否則找空缺
    const old = edges.find((e) => e.target === nodeId && e.source === parentId)
    const used = new Set(
      next
        .filter((e) => e.source === parentId)
        .map((e) => e.sourceHandle?.replace(/^opt-/i, '').toUpperCase())
        .filter(Boolean),
    )
    const letter =
      old?.sourceHandle?.match(/^opt-([A-F])$/i)?.[1]?.toUpperCase() ??
      CHOICE_LETTERS.find((l) => !used.has(l))
    if (!letter) {
      return { nodes, edges, ok: false, reason: '選單選項已滿（A–F）' }
    }
    sourceHandle = `opt-${letter}`
    // 同一 handle 只留一條
    next = next.filter(
      (e) => !(e.source === parentId && e.sourceHandle === sourceHandle),
    )
  } else {
    // 一般節點：來源只保留一條出邊
    next = next.filter((e) => e.source !== parentId)
  }

  next = [
    ...next,
    {
      id: nextId('e'),
      source: parentId,
      target: nodeId,
      sourceHandle: sourceHandle ?? undefined,
      label: sourceHandle?.replace(/^opt-/i, ''),
    },
  ]
  return { nodes, edges: next, ok: true }
}

/** 設定節點的出邊（選單需帶 letter） */
export function setOutgoingLink(
  nodeId: string,
  childId: string | null,
  nodes: FlowNode[],
  edges: Edge[],
  sourceHandle?: string | null,
): { nodes: FlowNode[]; edges: Edge[]; ok: boolean; reason?: string } {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return { nodes, edges, ok: false, reason: '節點不存在' }

  let next: Edge[]
  if (node.data.kind === 'choiceMenu') {
    const handle = sourceHandle ?? 'opt-A'
    next = edges.filter(
      (e) => !(e.source === nodeId && e.sourceHandle === handle),
    )
    if (!childId) return { nodes, edges: next, ok: true }
    const child = nodes.find((n) => n.id === childId)
    if (!child) return { nodes, edges, ok: false, reason: '後繼不存在' }
    if (!canConnectKinds(node.data.kind, child.data.kind)) {
      return { nodes, edges, ok: false, reason: '這兩種節點不能連接' }
    }
    next.push({
      id: nextId('e'),
      source: nodeId,
      target: childId,
      sourceHandle: handle,
      label: handle.replace(/^opt-/i, ''),
    })
    return { nodes, edges: next, ok: true }
  }

  next = edges.filter((e) => e.source !== nodeId)
  if (!childId) return { nodes, edges: next, ok: true }
  if (childId === nodeId) {
    return { nodes, edges, ok: false, reason: '不能連到自己' }
  }
  const child = nodes.find((n) => n.id === childId)
  if (!child) return { nodes, edges, ok: false, reason: '後繼不存在' }
  if (!canConnectKinds(node.data.kind, child.data.kind)) {
    return { nodes, edges, ok: false, reason: '這兩種節點不能連接' }
  }
  // 目標若已有入邊，先移除（維持單線）
  next = next.filter((e) => e.target !== childId)
  next.push({
    id: nextId('e'),
    source: nodeId,
    target: childId,
  })
  return { nodes, edges: next, ok: true }
}
