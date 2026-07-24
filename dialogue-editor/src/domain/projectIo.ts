import type { Edge } from '@xyflow/react'
import {
  csvRowsToString,
  flowToCsvRows,
  type FlowNode,
} from './exportCsv'
import { parseCsvText } from './importCsv'
import { rowsToFlow } from './rowsToFlow'
import {
  normalizeBoothId,
  type BoothMeta,
  type DialogueProject,
} from './types'

/** 組出可下載的專案 JSON 字串 */
export function serializeProject(
  meta: BoothMeta,
  nodes: FlowNode[],
  edges: Edge[],
): string {
  const project: DialogueProject = {
    version: 1,
    meta: { ...meta, boothId: normalizeBoothId(meta.boothId) },
    nodes,
    edges,
  }
  return JSON.stringify(project, null, 2)
}

export function parseProjectJson(text: string): DialogueProject {
  const raw: unknown = JSON.parse(text)
  if (!raw || typeof raw !== 'object') {
    throw new Error('專案 JSON 不是物件')
  }
  const v = raw as DialogueProject
  if (v.version !== 1) throw new Error('不支援的專案版本')
  if (!v.meta || typeof v.meta !== 'object') throw new Error('缺少 meta')
  if (!Array.isArray(v.nodes) || !Array.isArray(v.edges)) {
    throw new Error('缺少 nodes／edges')
  }
  return {
    version: 1,
    meta: {
      boothId: normalizeBoothId(v.meta.boothId),
      boothName: String(v.meta.boothName ?? ''),
      locale: String(v.meta.locale ?? 'zh_TW'),
      ...(v.meta.speakerName != null
        ? { speakerName: String(v.meta.speakerName) }
        : {}),
      ...(Array.isArray(v.meta.simChoiceLayouts)
        ? {
            simChoiceLayouts: v.meta.simChoiceLayouts
              .filter(
                (l): l is { letter: string; xPct: number; yPct: number } =>
                  Boolean(l) &&
                  typeof l === 'object' &&
                  typeof (l as { letter?: unknown }).letter === 'string' &&
                  typeof (l as { xPct?: unknown }).xPct === 'number' &&
                  typeof (l as { yPct?: unknown }).yPct === 'number',
              )
              .map((l) => ({
                letter: String(l.letter).toUpperCase(),
                xPct: l.xPct,
                yPct: l.yPct,
              })),
          }
        : {}),
    },
    nodes: v.nodes,
    edges: v.edges,
  }
}

/** 匯出含攤位名列的 CSV（含 BOM） */
export function buildExportCsv(
  meta: BoothMeta,
  nodes: FlowNode[],
  edges: Edge[],
): string {
  const boothId = normalizeBoothId(meta.boothId)
  const rows = flowToCsvRows({ ...meta, boothId }, nodes, edges)
  const csv = csvRowsToString(rows, meta.locale, true, false)
  const lines = csv.trimEnd().split('\n')
  const boothName = meta.boothName || `${boothId}攤位`
  const escaped =
    /[",\n\r]/.test(boothName)
      ? `"${boothName.replace(/"/g, '""')}"`
      : boothName
  return `\uFEFF${[lines[0], `,${escaped},,`, ...lines.slice(1)].join('\n')}\n`
}

/** CSV → 流程 → 再 CSV，用於驗證匯入匯出保真 */
export function roundtripCsv(csvText: string): {
  ids: string[]
  texts: string[]
  notes: string[]
} {
  const parsed = parseCsvText(csvText)
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
  return {
    ids: rows.map((r) => r.id),
    texts: rows.map((r) => r.zh_TW),
    notes: rows.map((r) => r.note),
  }
}
