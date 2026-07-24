import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import type { Edge } from '@xyflow/react'
import {
  buildExportCsv,
  parseProjectJson,
  roundtripCsv,
  serializeProject,
} from './projectIo'
import { parseCsvText } from './importCsv'
import { rowsToFlow } from './rowsToFlow'
import { flowToCsvRows, type FlowNode } from './exportCsv'
import { validateFlow } from './validate'
import {
  canConnectKinds,
  listConnectCandidates,
} from './connectionRules'

describe('匯入／匯出／存檔完整性', () => {
  it('專案 JSON 序列化後可完整還原 meta 與圖結構', () => {
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
    expect(() => parseProjectJson('{"version":2,"meta":{},"nodes":[],"edges":[]}')).toThrow()
  })

  it('CSV 匯出含 BOM 與攤位名列，再匯入可還原台詞', () => {
    const nodes: FlowNode[] = [
      {
        id: 'm1',
        type: 'message',
        position: { x: 0, y: 0 },
        data: {
          kind: 'message',
          title: '01攤位對話01',
          text: '「測試匯出」',
          note: '氣泡',
        },
      },
      {
        id: 'menu',
        type: 'choiceMenu',
        position: { x: 0, y: 100 },
        data: { kind: 'choiceMenu', title: '選單', text: '', note: '' },
      },
      {
        id: 'cA',
        type: 'choice',
        position: { x: 200, y: 100 },
        data: {
          kind: 'choice',
          title: 'A',
          text: '選項甲',
          note: '',
        },
      },
      {
        id: 'cE',
        type: 'choice',
        position: { x: 400, y: 100 },
        data: {
          kind: 'choice',
          title: 'E',
          text: '等一下再過來',
          note: '',
          isReturn: true,
        },
      },
      {
        id: 'a1',
        type: 'message',
        position: { x: 200, y: 200 },
        data: {
          kind: 'message',
          title: 'A1',
          text: '「內容」',
          note: '',
        },
      },
      {
        id: 'e1',
        type: 'message',
        position: { x: 400, y: 200 },
        data: {
          kind: 'message',
          title: 'E1',
          text: '「再見」',
          note: '',
        },
      },
    ]
    const edges: Edge[] = [
      { id: '1', source: 'm1', target: 'menu' },
      { id: '2', source: 'menu', target: 'cA', sourceHandle: 'opt-A' },
      { id: '3', source: 'menu', target: 'cE', sourceHandle: 'opt-E' },
      { id: '4', source: 'cA', target: 'a1' },
      { id: '5', source: 'cE', target: 'e1' },
    ]

    const csv = buildExportCsv(
      { boothId: '01', boothName: '01攤位', locale: 'zh_TW' },
      nodes,
      edges,
    )
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain(',01攤位,,')

    const trip = roundtripCsv(csv)
    expect(trip.ids).toEqual([
      '01_Msg01',
      '01_A_Name',
      '01_A_Content01',
      '01_E_Name',
      '01_E_Content01',
    ])
    expect(trip.texts).toContain('「測試匯出」')
    expect(trip.notes[0]).toBe('氣泡')
  })

  it('真實 Excel 範本：匯入後可存專案 JSON，再開回後匯出欄位一致', () => {
    const path = resolve(
      process.cwd(),
      '..',
      '《創作者的文化祭》攤位01台詞 - 範本.xlsx',
    )
    const wb = XLSX.read(readFileSync(path))
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]])
    const parsed = parseCsvText(csv)
    const flow = rowsToFlow(parsed)

    const issues = validateFlow(flow.nodes, flow.edges)
    expect(issues.filter((i) => i.level === 'error')).toHaveLength(0)

    const projectJson = serializeProject(
      {
        boothId: parsed.boothId,
        boothName: parsed.boothName,
        locale: parsed.locale,
      },
      flow.nodes,
      flow.edges,
    )
    const loaded = parseProjectJson(projectJson)
    const again = flowToCsvRows(
      loaded.meta,
      loaded.nodes as FlowNode[],
      loaded.edges as Edge[],
    )

    expect(again.map((r) => r.id)).toEqual(parsed.rows.map((r) => r.id))
    expect(again.map((r) => r.zh_TW)).toEqual(parsed.rows.map((r) => r.zh_TW))
    expect(again.map((r) => r.note)).toEqual(parsed.rows.map((r) => r.note))
  })
})

describe('連線候選清單', () => {
  it('message 可列出可接節點，且不含自己', () => {
    const nodes = [
      {
        id: 'a',
        data: { kind: 'message' as const, title: 'A', text: '' },
      },
      {
        id: 'b',
        data: { kind: 'choiceMenu' as const, title: '選單', text: '' },
      },
      {
        id: 'c',
        data: { kind: 'choice' as const, title: '選項', text: 'x' },
      },
    ]
    expect(canConnectKinds('message', 'choiceMenu')).toBe(true)
    expect(canConnectKinds('message', 'choice')).toBe(false)
    const list = listConnectCandidates('message', 'a', nodes)
    expect(list.map((x) => x.id)).toEqual(['b'])
  })

  it('choiceMenu 只能接到 choice', () => {
    expect(canConnectKinds('choiceMenu', 'choice')).toBe(true)
    expect(canConnectKinds('choiceMenu', 'message')).toBe(false)
  })
})
