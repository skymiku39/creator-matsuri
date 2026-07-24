import { useMemo, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  csvRowsToString,
  downloadText,
  flowToCsvRows,
} from '../domain/exportCsv'
import { parseCsvText } from '../domain/importCsv'
import { validateFlow } from '../domain/validate'
import { useDialogueStore } from '../store/useDialogueStore'
import { normalizeBoothId, type DialogueProject } from '../domain/types'
import type { FlowNode } from '../domain/exportCsv'
import type { Edge } from '@xyflow/react'

function isDialogueProject(value: unknown): value is DialogueProject {
  if (!value || typeof value !== 'object') return false
  const v = value as DialogueProject
  return (
    v.version === 1 &&
    v.meta != null &&
    typeof v.meta === 'object' &&
    Array.isArray(v.nodes) &&
    Array.isArray(v.edges)
  )
}

export function Toolbar() {
  const meta = useDialogueStore((s) => s.meta)
  const nodes = useDialogueStore((s) => s.nodes)
  const edges = useDialogueStore((s) => s.edges)
  const setMeta = useDialogueStore((s) => s.setMeta)
  const loadFromParsed = useDialogueStore((s) => s.loadFromParsed)
  const loadProject = useDialogueStore((s) => s.loadProject)
  const resetStarter = useDialogueStore((s) => s.resetStarter)
  const select = useDialogueStore((s) => s.select)
  const fileRef = useRef<HTMLInputElement>(null)

  const issues = useMemo(() => validateFlow(nodes, edges), [nodes, edges])
  const errorCount = issues.filter((i) => i.level === 'error').length

  const exportCsv = () => {
    if (errorCount > 0) {
      alert(`尚有 ${errorCount} 個錯誤，請先修正再匯出。`)
      return
    }
    const boothId = normalizeBoothId(meta.boothId)
    const rows = flowToCsvRows({ ...meta, boothId }, nodes, edges)
    const csv = csvRowsToString(rows, meta.locale, true, true)
    const lines = csv.replace(/^\uFEFF/, '').trimEnd().split('\n')
    const withBooth =
      `\uFEFF${[
        lines[0],
        `,${escapeCsv(meta.boothName)},,`,
        ...lines.slice(1),
      ].join('\n')}\n`
    downloadText(
      `《創作者的文化祭》攤位${boothId}台詞.csv`,
      withBooth,
      'text/csv;charset=utf-8',
    )
  }

  const exportXlsx = () => {
    if (errorCount > 0) {
      alert(`尚有 ${errorCount} 個錯誤，請先修正再匯出。`)
      return
    }
    const boothId = normalizeBoothId(meta.boothId)
    const rows = flowToCsvRows({ ...meta, boothId }, nodes, edges)
    const aoa: (string | number)[][] = [
      ['編號', '說明', meta.locale, '備註'],
      ['', meta.boothName, '', ''],
      ...rows.map((r) => [r.id, r.description, r.zh_TW, r.note]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `P${boothId}攤位`)
    XLSX.writeFile(wb, `《創作者的文化祭》攤位${boothId}台詞.xlsx`)
  }

  const exportProject = () => {
    const boothId = normalizeBoothId(meta.boothId)
    const project: DialogueProject = {
      version: 1,
      meta: { ...meta, boothId },
      nodes,
      edges,
    }
    downloadText(
      `booth_${boothId}_flow.json`,
      JSON.stringify(project, null, 2),
      'application/json',
    )
  }

  const onFile = async (file: File) => {
    try {
      const name = file.name.toLowerCase()
      if (name.endsWith('.json')) {
        const text = await file.text()
        const project: unknown = JSON.parse(text)
        if (!isDialogueProject(project)) {
          alert('專案 JSON 格式不正確（需要 version、meta、nodes、edges）。')
          return
        }
        loadProject(
          project.meta,
          project.nodes as FlowNode[],
          project.edges as Edge[],
        )
        return
      }

      if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf)
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const csv = XLSX.utils.sheet_to_csv(sheet)
        const parsed = parseCsvText(csv)
        if (parsed.skippedIds.length > 0) {
          alert(`有 ${parsed.skippedIds.length} 列編號無法辨識，已略過：\n${parsed.skippedIds.slice(0, 8).join('\n')}`)
        }
        loadFromParsed(parsed)
        return
      }

      const text = await file.text()
      const parsed = parseCsvText(text)
      if (parsed.skippedIds.length > 0) {
        alert(`有 ${parsed.skippedIds.length} 列編號無法辨識，已略過：\n${parsed.skippedIds.slice(0, 8).join('\n')}`)
      }
      loadFromParsed(parsed)
    } catch (err) {
      console.error(err)
      alert(`匯入失敗：${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <header className="toolbar">
      <div className="brand-block">
        <p className="brand">創作者的文化祭</p>
        <h1>攤位台詞流程編輯器</h1>
        <p className="tagline">視覺化編輯 → 匯出 RPGMV／MZ 用語句表（CSV／XLSX）</p>
      </div>

      <div className="toolbar-controls">
        <label className="field inline">
          <span>攤位編號</span>
          <input
            value={meta.boothId}
            onChange={(e) => {
              setMeta({ boothId: e.target.value.replace(/[^\d]/g, '') })
            }}
            onBlur={() =>
              setMeta({
                boothId: normalizeBoothId(meta.boothId || '01'),
              })
            }
          />
        </label>
        <label className="field inline">
          <span>攤位名稱</span>
          <input
            value={meta.boothName}
            onChange={(e) => setMeta({ boothName: e.target.value })}
          />
        </label>

        <div className="btn-row">
          <button
            type="button"
            onClick={() => {
              if (
                nodes.length > 0 &&
                !confirm('匯入會覆蓋目前畫布，確定繼續？')
              ) {
                return
              }
              fileRef.current?.click()
            }}
          >
            匯入
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onFile(f)
              e.target.value = ''
            }}
          />
          <button type="button" className="primary" onClick={exportCsv}>
            匯出 CSV
          </button>
          <button type="button" className="primary" onClick={exportXlsx}>
            匯出 Excel
          </button>
          <button type="button" onClick={exportProject}>
            存專案 JSON
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('確定重置為空白起步流程？未匯出內容將遺失。')) {
                resetStarter()
              }
            }}
          >
            重置
          </button>
        </div>

        {issues.length > 0 && (
          <ul className="issues">
            {issues.map((issue, i) => (
              <li key={i} className={issue.level}>
                <button
                  type="button"
                  className="issue-btn"
                  onClick={() => issue.nodeId && select(issue.nodeId)}
                >
                  {issue.level === 'error' ? '錯誤' : '注意'}：{issue.message}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  )
}

function escapeCsv(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}
