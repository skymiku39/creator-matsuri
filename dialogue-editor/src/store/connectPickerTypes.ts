import type { DialogueNodeKind } from '../domain/types'

export interface ConnectPickerState {
  sourceId: string
  sourceHandle: string | null
  sourceKind: DialogueNodeKind
  /** 螢幕座標，供浮動視窗定位 */
  clientX: number
  clientY: number
}
