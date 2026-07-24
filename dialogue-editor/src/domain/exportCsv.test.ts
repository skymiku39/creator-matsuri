import { describe, expect, it } from 'vitest'
import { csvRowsToString, flowToCsvRows } from './exportCsv'
import { groupRows, parseCsvText } from './importCsv'
import { rowsToFlow } from './rowsToFlow'
import { validateFlow } from './validate'
import { looksLikeReturnChoice, normalizeBoothId } from './types'
import type { FlowNode } from './exportCsv'
import type { Edge } from '@xyflow/react'
import { nextId, syncIdCounterFromGraph } from '../store/useDialogueStore'

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
    expect(rows[0].zh_TW).toBe('「你好啊~」')
    expect(rows.find((r) => r.id === '01_A_URL')?.note).toBe('此為超連結')
    expect(rows.find((r) => r.id === '01_E_Name')?.note).toBe('')
  })

  it('攤位編號會補零', () => {
    const { nodes, edges } = sampleFlow()
    const rows = flowToCsvRows(
      { ...meta, boothId: '1' },
      nodes,
      edges,
    )
    expect(rows[0].id).toBe('01_Msg01')
  })

  it('可序列化為含 BOM 的 CSV', () => {
    const { nodes, edges } = sampleFlow()
    const csv = csvRowsToString(flowToCsvRows(meta, nodes, edges), 'zh_TW', true, true)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('編號,說明,zh_TW,備註')
  })

  it('成環時不會無限迴圈', () => {
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
    const rows = flowToCsvRows(meta, nodes, edges)
    expect(rows.length).toBeLessThanOrEqual(2)
    const issues = validateFlow(nodes, edges)
    expect(issues.some((i) => i.message.includes('循環'))).toBe(true)
  })
})

describe('parseCsvText + roundtrip', () => {
  it('解析 CSV 並重建流程後可再匯出相同欄位', () => {
    const { nodes, edges } = sampleFlow()
    const csv = csvRowsToString(flowToCsvRows(meta, nodes, edges))
    const parsed = parseCsvText(csv)
    expect(parsed.boothId).toBe('01')
    const grouped = groupRows(parsed.rows)
    expect(grouped.messages).toHaveLength(2)
    expect(grouped.branches).toHaveLength(2)

    const flow = rowsToFlow(parsed)
    const again = flowToCsvRows(
      {
        boothId: parsed.boothId,
        boothName: parsed.boothName,
        locale: parsed.locale,
      },
      flow.nodes,
      flow.edges,
    )
    expect(again.map((r) => r.id)).toEqual(parsed.rows.map((r) => r.id))
    expect(again.map((r) => r.zh_TW)).toEqual(parsed.rows.map((r) => r.zh_TW))
    expect(again.map((r) => r.note)).toEqual(parsed.rows.map((r) => r.note))
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

  it('可解析帶 BOM 的 CSV', () => {
    const text = `\uFEFF編號,說明,zh_TW,備註
01_Msg01,對話01,你好,
`
    const parsed = parseCsvText(text)
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0].id).toBe('01_Msg01')
  })

  it('僅訊息的 CSV 不會產生空選單', () => {
    const text = `編號,說明,zh_TW,備註
01_Msg01,對話01,你好,
`
    const flow = rowsToFlow(parseCsvText(text))
    expect(flow.nodes.some((n) => n.data.kind === 'choiceMenu')).toBe(false)
    const issues = validateFlow(flow.nodes, flow.edges)
    expect(issues.some((i) => i.message.includes('尚未連接任何選項'))).toBe(
      false,
    )
  })

  it('回報無法辨識的編號', () => {
    const text = `編號,說明,zh_TW,備註
01_Msg01,對話01,你好,
01_A_Nam,錯字,x,
`
    const parsed = parseCsvText(text)
    expect(parsed.skippedIds).toContain('01_A_Nam')
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
      data: { kind: 'message', title: '孤立', text: '不會匯出', note: '' },
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
