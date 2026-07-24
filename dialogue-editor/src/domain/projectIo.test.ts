import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import {
  parseProjectJson,
  serializeProject,
} from './projectIo'
import type { FlowNode } from './flowGraph'
import { getTemplate } from './templates/catalog'
import { validateFlow } from './validate'

describe('專案 JSON 匯入／匯出', () => {
  it('序列化後可完整還原 meta、節點與邊', () => {
    const meta = {
      boothId: '1',
      boothName: '測試攤位',
      locale: 'zh_TW',
      speakerName: 'Mirai',
      simChoiceLayouts: [{ letter: 'A', xPct: 70, yPct: 12 }],
    }
    const nodes: FlowNode[] = [
      {
        id: 'msg_1',
        type: 'message',
        position: { x: 10, y: 20 },
        data: {
          kind: 'message',
          title: '開場',
          text: '「你好」',
          note: '備註A',
        },
      },
      {
        id: 'menu_1',
        type: 'choiceMenu',
        position: { x: 10, y: 120 },
        data: {
          kind: 'choiceMenu',
          title: '選單',
          text: '',
          note: '',
        },
      },
    ]
    const edges: Edge[] = [
      { id: 'e_1', source: 'msg_1', target: 'menu_1' },
    ]

    const json = serializeProject(meta, nodes, edges)
    const loaded = parseProjectJson(json)
    expect(loaded.meta.boothId).toBe('01')
    expect(loaded.meta.boothName).toBe('測試攤位')
    expect(loaded.meta.speakerName).toBe('Mirai')
    expect(loaded.meta.simChoiceLayouts).toEqual([
      { letter: 'A', xPct: 70, yPct: 12 },
    ])
    expect(loaded.nodes).toHaveLength(2)
    expect(loaded.edges).toHaveLength(1)
    expect((loaded.nodes[0] as FlowNode).data.text).toBe('「你好」')
  })

  it('損壞的專案 JSON 會拋錯', () => {
    expect(() => parseProjectJson('{}')).toThrow()
    expect(() =>
      parseProjectJson('{"version":2,"meta":{},"nodes":[],"edges":[]}'),
    ).toThrow()
    expect(() => parseProjectJson('not-json')).toThrow()
  })

  it('範本 JSON 可載入且通過基本驗證', () => {
    const tpl = getTemplate('rabbit-tea-party')
    expect(tpl).toBeTruthy()
    const data = tpl!.load()
    expect(data.nodes.length).toBeGreaterThan(5)
    expect(data.meta.speakerName).toBe('Mirai')
    const issues = validateFlow(data.nodes, data.edges)
    expect(issues.filter((i) => i.level === 'error')).toHaveLength(0)
  })
})
