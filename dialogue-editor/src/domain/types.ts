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

export const CHOICE_LETTERS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
] as const

export type ChoiceLetter = (typeof CHOICE_LETTERS)[number]
