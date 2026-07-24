import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import { collectReachableIds, type FlowNode } from './flowGraph'
import { validateFlow } from './validate'
import { looksLikeReturnChoice, normalizeBoothId } from './types'
import { nextId, syncIdCounterFromGraph } from '../store/useDialogueStore'

function sampleFlow(): { nodes: FlowNode[]; edges: Edge[] } {
  const nodes: FlowNode[] = [
    {
      id: 'm1',
      type: 'message',
      position: { x: 0, y: 0 },
      data: {
        kind: 'message',
        title: '01攤位對話01',
        text: '「你好啊~」',
        note: '',
      },
    },
    {
      id: 'm2',
      type: 'message',
      position: { x: 0, y: 100 },
      data: {
        kind: 'message',
        title: '01攤位對話02',
        text: '「想問什麼呢？」',
        note: '',
      },
    },
    {
      id: 'menu',
      type: 'choiceMenu',
      position: { x: 0, y: 200 },
      data: {
        kind: 'choiceMenu',
        title: '選單',
        text: '',
        note: '',
      },
    },
    {
      id: 'cA',
      type: 'choice',
      position: { x: 200, y: 0 },
      data: {
        kind: 'choice',
        title: '選項A',
        text: '再次辦活動的原因',
        note: '',
      },
    },
    {
      id: 'a1',
      type: 'message',
      position: { x: 200, y: 100 },
      data: {
        kind: 'message',
        title: 'A1',
        text: '「關於這點..」',
        note: '',
      },
    },
    {
      id: 'cE',
      type: 'choice',
      position: { x: 400, y: 0 },
      data: {
        kind: 'choice',
        title: '選項E',
        text: '等一下再過來',
        note: '',
        isReturn: true,
      },
    },
    {
      id: 'e1',
      type: 'message',
      position: { x: 400, y: 100 },
      data: {
        kind: 'message',
        title: 'E1',
        text: '「好的，等等見。」',
        note: '',
      },
    },
  ]

  const edges: Edge[] = [
    { id: 'e1', source: 'm1', target: 'm2' },
    { id: 'e2', source: 'm2', target: 'menu' },
    { id: 'e3', source: 'menu', target: 'cA', sourceHandle: 'opt-A' },
    { id: 'e4', source: 'cA', target: 'a1' },
    { id: 'e6', source: 'menu', target: 'cE', sourceHandle: 'opt-E' },
    { id: 'e7', source: 'cE', target: 'e1' },
  ]

  return { nodes, edges }
}

describe('flowGraph / validateFlow', () => {
  it('主幹節點皆可到達', () => {
    const { nodes, edges } = sampleFlow()
    const { ids, cycle } = collectReachableIds(nodes, edges)
    expect(cycle).toBe(false)
    expect(ids.has('m1')).toBe(true)
    expect(ids.has('a1')).toBe(true)
    expect(ids.has('e1')).toBe(true)
  })

  it('成環時標記 cycle', () => {
    const nodes: FlowNode[] = [
      {
        id: 'a',
        type: 'message',
        position: { x: 0, y: 0 },
        data: { kind: 'message', title: 'A', text: 'a', note: '' },
      },
      {
        id: 'b',
        type: 'message',
        position: { x: 0, y: 0 },
        data: { kind: 'message', title: 'B', text: 'b', note: '' },
      },
    ]
    const edges: Edge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'a' },
    ]
    const { cycle } = collectReachableIds(nodes, edges)
    expect(cycle).toBe(true)
    const issues = validateFlow(nodes, edges)
    expect(issues.some((i) => i.message.includes('循環'))).toBe(true)
  })

  it('缺少返回選項時提出警告', () => {
    const nodes: FlowNode[] = [
      {
        id: 'menu',
        type: 'choiceMenu',
        position: { x: 0, y: 0 },
        data: { kind: 'choiceMenu', title: '選單', text: '', note: '' },
      },
      {
        id: 'cA',
        type: 'choice',
        position: { x: 0, y: 0 },
        data: {
          kind: 'choice',
          title: 'A',
          text: '問問題',
          note: '',
        },
      },
    ]
    const edges: Edge[] = [{ id: 'e', source: 'menu', target: 'cA' }]
    const issues = validateFlow(nodes, edges)
    expect(issues.some((i) => i.message.includes('返回'))).toBe(true)
  })

  it('未連上主幹的節點為錯誤', () => {
    const { nodes, edges } = sampleFlow()
    const orphan: FlowNode = {
      id: 'orphan',
      type: 'message',
      position: { x: 0, y: 0 },
      data: { kind: 'message', title: '孤立', text: '不會走到', note: '' },
    }
    const issues = validateFlow([...nodes, orphan], edges)
    expect(issues.some((i) => i.message.includes('未連上主幹'))).toBe(true)
  })
})

describe('looksLikeReturnChoice', () => {
  it('不以備註中的說明文字誤判返回', () => {
    expect(
      looksLikeReturnChoice(
        '再次辦活動的原因',
        '一共有5個對話選項，可以依照創作的性質自訂，\n但每個對話選項之中必須包含返回的選項。',
      ),
    ).toBe(false)
    expect(looksLikeReturnChoice('等一下再過來', '')).toBe(true)
    expect(looksLikeReturnChoice('問問題', '返回選項')).toBe(true)
  })
})

describe('normalizeBoothId / nextId', () => {
  it('補零攤位編號', () => {
    expect(normalizeBoothId('1')).toBe('01')
    expect(normalizeBoothId('01')).toBe('01')
  })

  it('sync 後 nextId 不會與既有邊撞名', () => {
    const edges: Edge[] = [
      { id: 'e_1', source: 'a', target: 'b' },
      { id: 'e_2', source: 'b', target: 'c' },
      { id: 'e_3', source: 'c', target: 'd' },
    ]
    syncIdCounterFromGraph([], edges)
    const id = nextId('e')
    expect(id).not.toBe('e_1')
    expect(id).not.toBe('e_2')
    expect(id).not.toBe('e_3')
    expect(Number(id.split('_')[1])).toBeGreaterThan(3)
  })
})
