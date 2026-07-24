import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { flowToCsvRows } from './exportCsv'
import { groupRows, parseCsvText } from './importCsv'
import { rowsToFlow } from './rowsToFlow'

describe('Excel 範本 roundtrip', () => {
  it('匯入攤位01範本後可匯出相同編號、台詞與備註', () => {
    const path = resolve(
      process.cwd(),
      '..',
      '《創作者的文化祭》攤位01台詞 - 範本.xlsx',
    )
    const buf = readFileSync(path)
    const wb = XLSX.read(buf)
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]])
    const parsed = parseCsvText(csv)
    const grouped = groupRows(parsed.rows)

    expect(parsed.boothId).toBe('01')
    expect(grouped.messages).toHaveLength(2)
    expect(grouped.branches.map((b) => b.letter)).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
    ])

    const flow = rowsToFlow(parsed)
    const rows = flowToCsvRows(
      {
        boothId: parsed.boothId,
        boothName: parsed.boothName,
        locale: parsed.locale,
      },
      flow.nodes,
      flow.edges,
    )

    expect(rows.map((r) => r.id)).toEqual(parsed.rows.map((r) => r.id))
    expect(rows.map((r) => r.zh_TW)).toEqual(parsed.rows.map((r) => r.zh_TW))
    expect(rows.map((r) => r.note)).toEqual(parsed.rows.map((r) => r.note))
    expect(rows.map((r) => r.description)).toEqual(
      parsed.rows.map((r) => r.description),
    )
  })
})
