import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import { autoCompleteEndNodes } from './autoCompleteEnd'
import { syncIdCounterFromGraph } from '../store/idFactory'
import type { FlowNode } from './flowGraph'
import {
  advanceSimulation,
  createSimulation,
  pickChoice,
} from './simulate'
import { getTemplate, DIALOGUE_TEMPLATES } from './templates/catalog'

describe('autoCompleteEndNodes', () => {
  it('為沒有結束的分支補上 end', () => {
    syncIdCounterFromGraph([], [])
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
        position: { x: 100, y: 0 },
        data: {
          kind: 'choice',
          title: 'A',
          text: '問問題',
          note: '',
        },
      },
      {
        id: 'a1',
        type: 'message',
        position: { x: 100, y: 100 },
        data: {
          kind: 'message',
          title: 'A1',
          text: '答',
          note: '',
        },
      },
    ]
    const edges: Edge[] = [
      { id: 'e1', source: 'menu', target: 'cA', sourceHandle: 'opt-A' },
      { id: 'e2', source: 'cA', target: 'a1' },
    ]
    const result = autoCompleteEndNodes(nodes, edges)
    expect(result.added).toBe(1)
    expect(result.nodes.some((n) => n.data.kind === 'end')).toBe(true)
  })
})

describe('simulate', () => {
  it('可走完開場→選項→返回選單', () => {
    const tpl = getTemplate('simple-faq')!
    const { nodes, edges } = tpl.load()
    let phase = createSimulation(nodes, edges)
    expect(phase.type).toBe('message')

    phase = advanceSimulation(phase, nodes, edges)
    expect(phase.type).toBe('message')
    phase = advanceSimulation(phase, nodes, edges)
    expect(phase.type).toBe('choices')

    if (phase.type !== 'choices') throw new Error('expected choices')
    const leave = phase.options.find((o) => o.isReturn || /等一下/.test(o.text))
    expect(leave).toBeTruthy()
    phase = pickChoice(phase, nodes, edges, leave!.choiceId)
    // 選項內容
    expect(phase.type).toBe('message')
    phase = advanceSimulation(phase, nodes, edges)
    // 可能到 end 再回選單，或直接結束；simple-faq 無 end 時會 finished
    // 先補 end 再測返回
  })

  it('補完結束後，返回選項會回到選單', () => {
    const tpl = getTemplate('simple-faq')!
    let { nodes, edges } = tpl.load()
    const completed = autoCompleteEndNodes(nodes, edges)
    nodes = completed.nodes
    edges = completed.edges

    let phase = createSimulation(nodes, edges)
    while (phase.type === 'message') {
      phase = advanceSimulation(phase, nodes, edges)
    }
    expect(phase.type).toBe('choices')
    if (phase.type !== 'choices') return
    const leave = phase.options.find((o) => /等一下/.test(o.text))!
    phase = pickChoice(phase, nodes, edges, leave.choiceId)
    expect(phase.type).toBe('message')
    phase = advanceSimulation(phase, nodes, edges) // -> end -> choices
    expect(phase.type).toBe('choices')
  })
})

describe('templates', () => {
  it('包含兔子茶會並可載入', () => {
    expect(DIALOGUE_TEMPLATES.some((t) => t.id === 'rabbit-tea-party')).toBe(
      true,
    )
    const rabbit = getTemplate('rabbit-tea-party')!.load()
    expect(rabbit.meta.boothId).toBe('01')
    expect(rabbit.nodes.length).toBeGreaterThan(5)
    expect(
      rabbit.nodes.some((n) => n.data.text.includes('兔子茶會')),
    ).toBe(true)
  })
})
