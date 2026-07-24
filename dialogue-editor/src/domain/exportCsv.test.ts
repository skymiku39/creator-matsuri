import { describe, expect, it } from 'vitest'
import { csvRowsToString, flowToCsvRows } from './exportCsv'
import { groupRows, parseCsvText } from './importCsv'
import { rowsToFlow } from './rowsToFlow'
import { validateFlow } from './validate'
import type { FlowNode } from './exportCsv'
import type { Edge } from '@xyflow/react'

const meta = { boothId: '01', boothName: '01攤位', locale: 'zh_TW' }

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
      id: 'aUrl',
      type: 'url',
      position: { x: 200, y: 200 },
      data: {
        kind: 'url',
        title: '連結',
        text: 'https://example.com',
        note: '此為超連結',
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
    { id: 'e5', source: 'a1', target: 'aUrl' },
    { id: 'e6', source: 'menu', target: 'cE', sourceHandle: 'opt-E' },
    { id: 'e7', source: 'cE', target: 'e1' },
  ]

  return { nodes, edges }
}

describe('flowToCsvRows', () => {
  it('依範本慣例輸出編號與欄位', () => {
    const { nodes, edges } = sampleFlow()
    const rows = flowToCsvRows(meta, nodes, edges)
    expect(rows.map((r) => r.id)).toEqual([
      '01_Msg01',
      '01_Msg02',
      '01_A_Name',
      '01_A_Content01',
      '01_A_URL',
      '01_E_Name',
      '01_E_Content01',
    ])
    // 選項字母以 sourceHandle（opt-A / opt-E）為準，而非順序索引
    expect(rows[0].zh_TW).toBe('「你好啊~」')
    expect(rows.find((r) => r.id === '01_A_URL')?.note).toBe('此為超連結')
  })

  it('可序列化為 CSV 字串', () => {
    const { nodes, edges } = sampleFlow()
    const csv = csvRowsToString(flowToCsvRows(meta, nodes, edges))
    expect(csv).toContain('編號,說明,zh_TW,備註')
    expect(csv).toContain('01_Msg01')
  })
})

describe('parseCsvText + roundtrip', () => {
  it('解析 CSV 並重建流程後可再匯出相同編號序列', () => {
    const { nodes, edges } = sampleFlow()
    const csv = csvRowsToString(flowToCsvRows(meta, nodes, edges))
    const parsed = parseCsvText(csv)
    expect(parsed.boothId).toBe('01')
    const grouped = groupRows(parsed.rows)
    expect(grouped.messages).toHaveLength(2)
    expect(grouped.branches).toHaveLength(2)

    const flow = rowsToFlow(parsed)
    const again = flowToCsvRows(
      { boothId: parsed.boothId, boothName: parsed.boothName, locale: parsed.locale },
      flow.nodes,
      flow.edges,
    )
    expect(again.map((r) => r.id)).toEqual(parsed.rows.map((r) => r.id))
    expect(again.map((r) => r.zh_TW)).toEqual(parsed.rows.map((r) => r.zh_TW))
  })

  it('正確處理含逗號與換行的欄位', () => {
    const text = `編號,說明,zh_TW,備註
01_Msg01,對話01,"「你好, 世界」","備註
第二行"
`
    const parsed = parseCsvText(text)
    expect(parsed.rows[0].zh_TW).toBe('「你好, 世界」')
    expect(parsed.rows[0].note).toContain('第二行')
  })
})

describe('validateFlow', () => {
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
    const edges: Edge[] = [
      { id: 'e', source: 'menu', target: 'cA' },
    ]
    const issues = validateFlow(nodes, edges)
    expect(issues.some((i) => i.message.includes('返回'))).toBe(true)
  })
})
