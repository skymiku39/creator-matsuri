/** 節點類型：對應 RPGMV 台詞流程常見元素 */
export type DialogueNodeKind =
  | 'message'
  | 'choiceMenu'
  | 'choice'
  | 'url'
  | 'end'

export interface DialogueNodeData extends Record<string, unknown> {
  kind: DialogueNodeKind
  /** 顯示用短標籤（非匯出編號） */
  title: string
  /** zh_TW 台詞／選項文字／URL */
  text: string
  /** 備註（氣泡、超連結說明等） */
  note: string
  /** 是否為「返回選單」類選項（驗證用） */
  isReturn?: boolean
}

export interface CsvRow {
  id: string
  description: string
  zh_TW: string
  note: string
}

export interface BoothMeta {
  /** 攤位編號，如 01 */
  boothId: string
  /** 工作表／攤位名稱，如 01攤位 */
  boothName: string
  /** 語系欄位名 */
  locale: string
}

export interface DialogueProject {
  version: 1
  meta: BoothMeta
  /** React Flow 序列化資料 */
  nodes: unknown[]
  edges: unknown[]
}

/** 對齊 RPGMV Show Choices 上限（最多 6） */
export const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const

export type ChoiceLetter = (typeof CHOICE_LETTERS)[number]

/** 正規化攤位編號為至少兩位（1 → 01） */
export function normalizeBoothId(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '') || '1'
  return digits.padStart(2, '0')
}

/** 判斷選項文案是否像「返回／離開」類（收斂關鍵字，避免誤判） */
export function looksLikeReturnChoice(text: string, note = ''): boolean {
  const t = text.trim()
  if (note.includes('返回')) return true
  return /等一下再過來|稍後再來|返回選單|^返回$|^離開$|^再見$/.test(t)
}
