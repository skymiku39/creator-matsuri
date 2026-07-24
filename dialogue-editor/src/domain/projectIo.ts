import type { Edge } from '@xyflow/react'
import type { FlowNode } from './flowGraph'
import {
  normalizeBoothId,
  type BoothMeta,
  type DialogueProject,
  type SimChoiceLayout,
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

function isSimLayout(v: unknown): v is SimChoiceLayout {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.letter === 'string' &&
    typeof o.xPct === 'number' &&
    typeof o.yPct === 'number'
  )
}

/** 解析並驗證專案 JSON（唯一的匯入格式） */
export function parseProjectJson(text: string): DialogueProject {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('專案 JSON 格式無效')
  }
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
              .filter(isSimLayout)
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

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
