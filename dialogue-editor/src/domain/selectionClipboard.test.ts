import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import { expandLinearSegment, linearSegmentInterval } from './linearSegment'
import {
  captureSelection,
  pasteSelectionDuplicate,
} from './selectionClipboard'
import { setIncomingLink, setOutgoingLink } from './linkEdit'
import type { FlowNode } from './flowGraph'
import { syncIdCounterFromGraph } from '../store/idFactory'

function sample(): { nodes: FlowNode[]; edges: Edge[] } {
  const nodes: FlowNode[] = [
    {
      id: 'm1',
      type: 'message',
      position: { x: 0, y: 0 },
      data: { kind: 'message', title: '開場1', text: 'a', note: '' },
    },
    {
      id: 'm2',
      type: 'message',
      position: { x: 0, y: 100 },
      data: { kind: 'message', title: '開場2', text: 'b', note: '' },
    },
    {
      id: 'menu',
      type: 'choiceMenu',
      position: { x: 0, y: 200 },
      data: { kind: 'choiceMenu', title: '選單', text: '', note: '' },
    },
    {
      id: 'cA',
      type: 'choice',
      position: { x: 200, y: 0 },
      data: { kind: 'choice', title: 'A', text: '問A', note: '' },
    },
    {
      id: 'a1',
      type: 'message',
      position: { x: 200, y: 100 },
      data: { kind: 'message', title: 'A1', text: '答A', note: '' },
    },
    {
      id: 'cB',
      type: 'choice',
      position: { x: 400, y: 0 },
      data: { kind: 'choice', title: 'B', text: '問B', note: '' },
    },
    {
      id: 'b1',
      type: 'message',
      position: { x: 400, y: 100 },
      data: { kind: 'message', title: 'B1', text: '答B', note: '' },
    },
  ]
  const edges: Edge[] = [
    { id: 'e1', source: 'm1', target: 'm2' },
    { id: 'e2', source: 'm2', target: 'menu' },
    { id: 'e3', source: 'menu', target: 'cA', sourceHandle: 'opt-A' },
    { id: 'e4', source: 'cA', target: 'a1' },
    { id: 'e5', source: 'menu', target: 'cB', sourceHandle: 'opt-B' },
    { id: 'e6', source: 'cB', target: 'b1' },
  ]
  return { nodes, edges }
}

describe('linearSegmentInterval', () => {
  it('同線閉區間含起點終點，順序可對調', () => {
    const { nodes, edges } = sample()
    expect(linearSegmentInterval('cA', 'a1', nodes, edges)).toEqual([
      'cA',
      'a1',
    ])
    expect(linearSegmentInterval('a1', 'cA', nodes, edges)).toEqual([
      'cA',
      'a1',
    ])
    expect(linearSegmentInterval('m1', 'm2', nodes, edges)).toEqual([
      'm1',
      'm2',
    ])
  })

  it('開場與選單可視為同線區間', () => {
    const { nodes, edges } = sample()
    expect(linearSegmentInterval('m1', 'menu', nodes, edges)).toEqual([
      'm1',
      'm2',
      'menu',
    ])
  })

  it('跨不同選項分支則失敗', () => {
    const { nodes, edges } = sample()
    expect(linearSegmentInterval('cA', 'cB', nodes, edges)).toBeNull()
    expect(linearSegmentInterval('a1', 'b1', nodes, edges)).toBeNull()
  })
})

describe('expandLinearSegment', () => {
  it('開場停在選單前', () => {
    const { nodes, edges } = sample()
    expect(expandLinearSegment('m1', nodes, edges)).toEqual(['m1', 'm2'])
    expect(expandLinearSegment('menu', nodes, edges)).toEqual([
      'm1',
      'm2',
      'menu',
    ])
  })

  it('選項分支不含選單與其他選項', () => {
    const { nodes, edges } = sample()
    expect(expandLinearSegment('a1', nodes, edges)).toEqual(['cA', 'a1'])
    expect(expandLinearSegment('cA', nodes, edges)).toEqual(['cA', 'a1'])
  })
})

describe('selectionClipboard', () => {
  it('Ctrl+C／V 會複製選取節點與內部連線', () => {
    const { nodes, edges } = sample()
    syncIdCounterFromGraph(nodes, edges)
    const clip = captureSelection(['cA', 'a1'], nodes, edges)
    expect(clip).toBeTruthy()
    expect(clip!.nodes).toHaveLength(2)
    expect(clip!.edges).toHaveLength(1)

    const pasted = pasteSelectionDuplicate(clip!, nodes, edges)
    expect(pasted.newIds).toHaveLength(2)
    expect(pasted.nodes.length).toBe(nodes.length + 2)
    expect(
      pasted.edges.some(
        (e) =>
          e.source === pasted.newIds[0] && e.target === pasted.newIds[1],
      ),
    ).toBe(true)
  })
})

describe('linkEdit', () => {
  it('可改後繼與前驅', () => {
    const { nodes, edges } = sample()
    syncIdCounterFromGraph(nodes, edges)
    const cut = setOutgoingLink('cA', null, nodes, edges)
    expect(cut.edges.some((e) => e.source === 'cA')).toBe(false)
    const linked = setOutgoingLink('cA', 'b1', cut.nodes, cut.edges)
    expect(linked.ok).toBe(true)
    expect(linked.edges.some((e) => e.source === 'cA' && e.target === 'b1')).toBe(
      true,
    )

    const reparent = setIncomingLink('a1', 'cB', nodes, edges)
    expect(reparent.ok).toBe(true)
    expect(
      reparent.edges.some((e) => e.source === 'cB' && e.target === 'a1'),
    ).toBe(true)
  })
})
