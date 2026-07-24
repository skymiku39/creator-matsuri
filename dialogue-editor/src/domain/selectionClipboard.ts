import type { Edge } from '@xyflow/react'
import type { DialogueNodeData } from './types'
import type { FlowNode } from './flowGraph'
import { nextId } from '../store/idFactory'

/** Ctrl+C 時保存的選取複本（僅含選取節點之間的邊） */
export interface SelectionClipboard {
  nodes: Array<{
    kind: DialogueNodeData['kind']
    position: { x: number; y: number }
    data: DialogueNodeData
  }>
  edges: Array<{
    sourceIndex: number
    targetIndex: number
    sourceHandle?: string | null
    targetHandle?: string | null
    label?: string | unknown
  }>
}

export function captureSelection(
  selectedIds: string[],
  nodes: FlowNode[],
  edges: Edge[],
): SelectionClipboard | null {
  const idSet = new Set(selectedIds)
  const selected = nodes.filter((n) => idSet.has(n.id))
  if (selected.length === 0) return null

  const indexOf = new Map(selected.map((n, i) => [n.id, i]))
  const internalEdges = edges.filter(
    (e) => idSet.has(e.source) && idSet.has(e.target),
  )

  return {
    nodes: selected.map((n) => ({
      kind: n.data.kind,
      position: { ...n.position },
      data: { ...n.data },
    })),
    edges: internalEdges.map((e) => ({
      sourceIndex: indexOf.get(e.source)!,
      targetIndex: indexOf.get(e.target)!,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      label: e.label,
    })),
  }
}

/** 在圖上貼上複本（偏移），回傳新節點 id */
export function pasteSelectionDuplicate(
  clip: SelectionClipboard,
  nodes: FlowNode[],
  edges: Edge[],
  offset = { x: 48, y: 48 },
): { nodes: FlowNode[]; edges: Edge[]; newIds: string[] } {
  const newIds: string[] = []
  const clones: FlowNode[] = clip.nodes.map((src) => {
    const id = nextId(src.kind)
    newIds.push(id)
    return {
      id,
      type: src.kind,
      position: {
        x: src.position.x + offset.x,
        y: src.position.y + offset.y,
      },
      data: { ...src.data },
      selected: true,
    }
  })

  const newEdges: Edge[] = clip.edges.map((e) => ({
    id: nextId('e'),
    source: newIds[e.sourceIndex],
    target: newIds[e.targetIndex],
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    label: e.label as string | undefined,
  }))

  const deselected = nodes.map((n) => ({ ...n, selected: false }))
  return {
    nodes: [...deselected, ...clones],
    edges: [...edges, ...newEdges],
    newIds,
  }
}
