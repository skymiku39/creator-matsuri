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
import { validateFlow } from './validate'

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
    const end = result.nodes.find((n) => n.data.kind === 'end')
    expect(end).toBeTruthy()
    // 一般選項補的是「回到選單」
    expect(end!.data.endAction).toBe('menu')
  })

  it('離開選項補的是「結束對話」', () => {
    syncIdCounterFromGraph([], [])
    const nodes: FlowNode[] = [
      {
        id: 'menu',
        type: 'choiceMenu',
        position: { x: 0, y: 0 },
        data: { kind: 'choiceMenu', title: '選單', text: '', note: '' },
      },
      {
        id: 'cE',
        type: 'choice',
        position: { x: 100, y: 0 },
        data: { kind: 'choice', title: 'E', text: '等一下再過來', note: '' },
      },
      {
        id: 'e1msg',
        type: 'message',
        position: { x: 100, y: 100 },
        data: { kind: 'message', title: 'E1', text: '等等見', note: '' },
      },
    ]
    const edges: Edge[] = [
      { id: 'e1', source: 'menu', target: 'cE', sourceHandle: 'opt-E' },
      { id: 'e2', source: 'cE', target: 'e1msg' },
    ]
    const result = autoCompleteEndNodes(nodes, edges)
    expect(result.added).toBe(1)
    const end = result.nodes.find((n) => n.data.kind === 'end')
    expect(end!.data.endAction).toBe('finish')
  })
})

describe('simulate', () => {
  /** 走到選單為止 */
  function toMenu(nodes: FlowNode[], edges: Edge[]) {
    let phase = createSimulation(nodes, edges)
    while (phase.type === 'message') {
      phase = advanceSimulation(phase, nodes, edges)
    }
    if (phase.type !== 'choices') throw new Error('expected choices')
    return phase
  }

  /** 選擇後一路點到下一個選單或結束 */
  function playBranch(
    nodes: FlowNode[],
    edges: Edge[],
    menu: ReturnType<typeof toMenu>,
    choiceId: string,
  ) {
    let phase = pickChoice(menu, nodes, edges, choiceId)
    while (phase.type === 'message' || phase.type === 'url') {
      phase = advanceSimulation(phase, nodes, edges)
    }
    return phase
  }

  function completedTemplate(id: string) {
    const loaded = getTemplate(id)!.load()
    return autoCompleteEndNodes(loaded.nodes, loaded.edges)
  }

  it('一般選項講完回到選單', () => {
    const { nodes, edges } = completedTemplate('rabbit-tea-party')
    const menu = toMenu(nodes, edges)
    const normal = menu.options.filter((o) => !o.isReturn)
    expect(normal.length).toBeGreaterThan(0)
    for (const option of normal) {
      expect(playBranch(nodes, edges, menu, option.choiceId).type).toBe(
        'choices',
      )
    }
  })

  it('離開選項講完結束對話', () => {
    const { nodes, edges } = completedTemplate('rabbit-tea-party')
    const menu = toMenu(nodes, edges)
    const leave = menu.options.find((o) => o.isReturn)!
    expect(leave.text).toMatch(/等一下/)
    expect(playBranch(nodes, edges, menu, leave.choiceId)).toEqual({
      type: 'finished',
      reason: 'end',
    })
  })

  it('沒有結束節點的分支比照預設行為', () => {
    // 未補全：一般選項的最後一句之後仍回選單
    const { nodes, edges } = getTemplate('simple-faq')!.load()
    const menu = toMenu(nodes, edges)
    const normal = menu.options.find((o) => !o.isReturn)!
    expect(playBranch(nodes, edges, menu, normal.choiceId).type).toBe('choices')
  })

  it('結束節點明確指定的行為優先於預設', () => {
    const { nodes, edges } = completedTemplate('simple-faq')
    const flipped = nodes.map((n) =>
      n.data.kind === 'end'
        ? {
            ...n,
            data: {
              ...n.data,
              endAction:
                n.data.endAction === 'menu'
                  ? ('finish' as const)
                  : ('menu' as const),
            },
          }
        : n,
    )
    const menu = toMenu(flipped, edges)
    const normal = menu.options.find((o) => !o.isReturn)!
    const leave = menu.options.find((o) => o.isReturn)!
    expect(playBranch(flipped, edges, menu, normal.choiceId).type).toBe(
      'finished',
    )
    expect(playBranch(flipped, edges, menu, leave.choiceId).type).toBe(
      'choices',
    )
  })
})

describe('validate：結束行為', () => {
  it('所有分支都回選單時提出警告', () => {
    const loaded = getTemplate('simple-faq')!.load()
    const { nodes, edges } = autoCompleteEndNodes(loaded.nodes, loaded.edges)
    expect(
      validateFlow(nodes, edges).some((i) => i.message.includes('無法結束')),
    ).toBe(false)

    const allMenu = nodes.map((n) =>
      n.data.kind === 'end'
        ? { ...n, data: { ...n.data, endAction: 'menu' as const } }
        : n,
    )
    expect(
      validateFlow(allMenu, edges).some((i) => i.message.includes('無法結束')),
    ).toBe(true)
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
