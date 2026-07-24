import {
  CHOICE_LETTERS,
  normalizeBoothId,
  type CsvRow,
} from './types'

export interface ParsedTemplate {
  boothId: string
  boothName: string
  locale: string
  rows: CsvRow[]
  skippedIds: string[]
}

/** 解析範本 CSV（欄位：編號,說明,zh_TW,備註） */
export function parseCsvText(text: string): ParsedTemplate {
  const cleaned = text.replace(/^\uFEFF/, '')
  const lines = splitCsv(cleaned)
  if (lines.length === 0) {
    return {
      boothId: '01',
      boothName: '01攤位',
      locale: 'zh_TW',
      rows: [],
      skippedIds: [],
    }
  }

  let start = 0
  let locale = 'zh_TW'
  const header = lines[0].map((c) => c.replace(/^\uFEFF/, '').trim())
  const header0 = header[0]?.toLowerCase()
  if (header[0] === '編號' || header0 === 'id') {
    locale = header[2] || 'zh_TW'
    start = 1
  }

  const rows: CsvRow[] = []
  let boothName = ''
  let boothId = '01'

  for (let i = start; i < lines.length; i++) {
    const cols = lines[i]
    if (!cols.length || cols.every((c) => !c.trim())) continue

    // 標題列：空編號 + 攤位名
    if (!cols[0]?.trim() && cols[1]?.trim()) {
      boothName = cols[1].trim()
      const m = boothName.match(/^(\d+)/)
      if (m) boothId = normalizeBoothId(m[1])
      continue
    }

    if (!cols[0]?.trim()) continue

    const id = cols[0].trim()
    const idMatch = id.match(/^(\d+)_/)
    if (idMatch) boothId = normalizeBoothId(idMatch[1])

    rows.push({
      id,
      description: cols[1]?.trim() ?? '',
      zh_TW: cols[2] ?? '',
      note: cols[3] ?? '',
    })
  }

  boothId = normalizeBoothId(boothId)
  if (!boothName) {
    boothName = `${boothId}攤位`
  }

  const { messages, branches, skippedIds } = groupRows(rows)

  return {
    boothId,
    boothName,
    locale,
    rows: [
      ...messages,
      ...branches.flatMap((b) => [
        ...(b.name ? [b.name] : []),
        ...b.contents,
        ...(b.url ? [b.url] : []),
      ]),
    ],
    skippedIds,
  }
}

function splitCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      row.push(field)
      field = ''
      continue
    }
    if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      continue
    }
    if (ch === '\r') continue
    field += ch
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

export interface BranchGroup {
  letter: string
  name?: CsvRow
  contents: CsvRow[]
  url?: CsvRow
}

/** 將平坦列分組成開場訊息與選項分支（供建流程圖） */
export function groupRows(rows: CsvRow[]): {
  messages: CsvRow[]
  branches: BranchGroup[]
  skippedIds: string[]
} {
  const messages: CsvRow[] = []
  const branchMap = new Map<string, BranchGroup>()
  const skippedIds: string[] = []

  for (const row of rows) {
    const msg = row.id.match(/^\d+_Msg(\d+)$/i)
    if (msg) {
      messages.push(row)
      continue
    }

    const name = row.id.match(/^\d+_([A-F])_Name$/i)
    if (name) {
      const letter = name[1].toUpperCase()
      const g = branchMap.get(letter) ?? { letter, contents: [] }
      g.name = row
      branchMap.set(letter, g)
      continue
    }

    const content = row.id.match(/^\d+_([A-F])_Content(\d+)$/i)
    if (content) {
      const letter = content[1].toUpperCase()
      const g = branchMap.get(letter) ?? { letter, contents: [] }
      g.contents.push(row)
      branchMap.set(letter, g)
      continue
    }

    const url = row.id.match(/^\d+_([A-F])_URL$/i)
    if (url) {
      const letter = url[1].toUpperCase()
      const g = branchMap.get(letter) ?? { letter, contents: [] }
      g.url = row
      branchMap.set(letter, g)
      continue
    }

    skippedIds.push(row.id)
  }

  messages.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  for (const g of branchMap.values()) {
    g.contents.sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true }),
    )
  }

  const branches = CHOICE_LETTERS.map((l) => branchMap.get(l)).filter(
    (g): g is BranchGroup => Boolean(g),
  )

  return { messages, branches, skippedIds }
}
