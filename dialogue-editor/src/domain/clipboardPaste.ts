import type { Edge } from '@xyflow/react'
import type { DialogueNodeData } from './types'
import type { FlowNode } from './flowGraph'
import { expandLinearSegment, incomingEdges, outgoingEdges } from './linearSegment'
import { nextId } from '../store/idFactory'

export type ClipboardMode = 'segment' | 'single'

export interface GraphClipboard {
  mode: ClipboardMode
  /** 使用者點的錨點 */
  anchorId: string
  /** segment：頭到尾；single：僅一點 */
  nodeIds: string[]
}

export function createClipboard(
  mode: ClipboardMode,
  anchorId: string,
  nodes: FlowNode[],
  edges: Edge[],
): GraphClipboard {
  if (mode === 'single') {
    return { mode, anchorId, nodeIds: [anchorId] }
  }
  return {
    mode,
    anchorId,
    nodeIds: expandLinearSegment(anchorId, nodes, edges),
  }
}

function cloneData(data: DialogueNodeData): DialogueNodeData {
  return { ...data }
}

/**
 * 將剪貼簿貼到目標節點。
 * - single：覆寫目標的文字欄位（需同 kind）
 * - segment：刪除目標線性片段並插入來源片段的複本，重接上下游
 */
export function pasteClipboard(
  clipboard: GraphClipboard,
  targetId: string,
  nodes: FlowNode[],
  edges: Edge[],
): { nodes: FlowNode[]; edges: Edge[]; ok: boolean; reason?: string } {
  if (clipboard.nodeIds.includes(targetId)) {
    return { nodes, edges, ok: false, reason: '不能貼到來源片段上' }
  }
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const sourceNodes = clipboard.nodeIds
    .map((id) => byId.get(id))
    .filter((n): n is FlowNode => Boolean(n))
  if (sourceNodes.length === 0) {
    return { nodes, edges, ok: false, reason: '來源已不存在' }
  }
  const target = byId.get(targetId)
  if (!target) {
    return { nodes, edges, ok: false, reason: '目標不存在' }
  }

  if (clipboard.mode === 'single') {
    const src = sourceNodes[0]
    if (src.data.kind !== target.data.kind) {
      return {
        nodes,
        edges,
        ok: false,
        reason: '單一節點貼上需種類相同',
      }
    }
    const nextNodes = nodes.map((n) =>
      n.id === targetId
        ? {
            ...n,
            data: {
              ...cloneData(src.data),
              kind: target.data.kind,
            },
          }
        : n,
    )
    return { nodes: nextNodes, edges, ok: true }
  }

  return pasteSegment(sourceNodes, target, nodes, edges)
}

function pasteSegment(
  sourceNodes: FlowNode[],
  target: FlowNode,
  nodes: FlowNode[],
  edges: Edge[],
): { nodes: FlowNode[]; edges: Edge[]; ok: boolean; reason?: string } {
  const targetSeg = expandLinearSegment(target.id, nodes, edges)
  if (targetSeg.length === 0) {
    return { nodes, edges, ok: false, reason: '無法解析目標片段' }
  }

  const srcHead = sourceNodes[0]
  const tgtHeadId = targetSeg[0]
  const tgtHead = nodes.find((n) => n.id === tgtHeadId)!
  const keepChoiceAnchor =
    srcHead.data.kind === 'choice' &&
    tgtHead.data.kind === 'choice' &&
    target.data.kind === 'choice'

  const sourceBody = keepChoiceAnchor ? sourceNodes.slice(1) : sourceNodes
  const removeIds = new Set(
    keepChoiceAnchor ? targetSeg.slice(1) : targetSeg,
  )

  const headId = targetSeg[0]
  const tailId = targetSeg[targetSeg.length - 1]
  const inEdges = keepChoiceAnchor
    ? []
    : incomingEdges(headId, edges).filter((e) => !targetSeg.includes(e.source))
  const outEdges = outgoingEdges(tailId, edges).filter(
    (e) => !targetSeg.includes(e.target),
  )

  let nextNodes = nodes.filter((n) => !removeIds.has(n.id))
  let nextEdges = edges.filter(
    (e) => !removeIds.has(e.source) && !removeIds.has(e.target),
  )

  if (keepChoiceAnchor) {
    nextEdges = nextEdges.filter((e) => e.source !== tgtHeadId)
  }

  if (sourceBody.length === 0) {
    return { nodes: nextNodes, edges: nextEdges, ok: true }
  }

  const basePos = keepChoiceAnchor ? tgtHead.position : target.position
  const srcOrigin = sourceBody[0].position
  const idMap = new Map<string, string>()
  const clones: FlowNode[] = sourceBody.map((src) => {
    const id = nextId(src.data.kind)
    idMap.set(src.id, id)
    return {
      id,
      type: src.data.kind,
      position: {
        x: basePos.x + (src.position.x - srcOrigin.x),
        y: basePos.y + (src.position.y - srcOrigin.y) + (keepChoiceAnchor ? 120 : 0),
      },
      data: cloneData(src.data),
      selected: false,
    }
  })
  nextNodes = [...nextNodes, ...clones]

  const sourceIdSet = new Set(sourceNodes.map((n) => n.id))
  for (const e of edges) {
    if (!sourceIdSet.has(e.source) || !sourceIdSet.has(e.target)) continue
    if (keepChoiceAnchor && e.source === srcHead.id) {
      const newTarget = idMap.get(e.target)
      if (!newTarget) continue
      nextEdges.push({
        id: nextId('e'),
        source: tgtHeadId,
        target: newTarget,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })
      continue
    }
    const s = idMap.get(e.source)
    const t = idMap.get(e.target)
    if (!s || !t) continue
    nextEdges.push({
      id: nextId('e'),
      source: s,
      target: t,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })
  }

  const cloneHead = idMap.get(sourceBody[0].id)!
  const cloneTail = idMap.get(sourceBody[sourceBody.length - 1].id)!

  if (keepChoiceAnchor) {
    if (!nextEdges.some((e) => e.source === tgtHeadId && e.target === cloneHead)) {
      nextEdges.push({
        id: nextId('e'),
        source: tgtHeadId,
        target: cloneHead,
      })
    }
  } else {
    for (const e of inEdges) {
      nextEdges.push({
        id: nextId('e'),
        source: e.source,
        target: cloneHead,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })
    }
  }

  for (const e of outEdges) {
    nextEdges.push({
      id: nextId('e'),
      source: cloneTail,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })
  }

  return { nodes: nextNodes, edges: nextEdges, ok: true }
}
