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
  /** 引用 meta.characters 的人物 id；空則用攤位預設說話者 */
  speakerId?: string
  /** 本句自訂說話者（優先於 speakerId／預設） */
  speakerName?: string
}

/** 專案層人物設定（可被多句台詞引用） */
export interface CharacterDef {
  id: string
  /** 顯示名稱（訊息框黃字） */
  name: string
  /** 選填備註（人設／聲線等） */
  note?: string
}

export interface SimChoiceLayout {
  /** 選項字母 A–F */
  letter: string
  /** 相對視窗左上角百分比 0–100 */
  xPct: number
  yPct: number
}

export interface BoothMeta {
  /** 攤位編號，如 01 */
  boothId: string
  /** 工作表／攤位名稱，如 01攤位 */
  boothName: string
  /** 語系欄位名 */
  locale: string
  /** 預設說話者名稱（對應 RPG 訊息框上方黃字；節點未覆寫時使用） */
  speakerName?: string
  /** 人物設定表（節點可用 speakerId 引用） */
  characters?: CharacterDef[]
  /** 模擬畫面選項方塊位置（可拖曳儲存） */
  simChoiceLayouts?: SimChoiceLayout[]
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

/** 判斷選項文案是否像「返回／離開」類（收斂關鍵字，避免備註誤判） */
export function looksLikeReturnChoice(text: string, note = ''): boolean {
  const t = text.trim()
  const n = note.trim()
  // 僅認明確標記，避免「必須包含返回的選項」這類說明誤判
  if (/^(返回選項|此為返回選項|返回／離開)$/.test(n)) return true
  return /等一下再過來|稍後再來|返回選單|^返回$|^離開$|^再見$/.test(t)
}
