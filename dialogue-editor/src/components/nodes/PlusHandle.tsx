import { Handle, Position, type HandleProps } from '@xyflow/react'
import type { CSSProperties, MouseEvent } from 'react'
import { useDialogueStore } from '../../store/useDialogueStore'
import type { DialogueNodeKind } from '../../domain/types'

type PlusHandleProps = {
  nodeId: string
  sourceKind: DialogueNodeKind
  position: HandleProps['position']
  id?: string
  badge?: string
  style?: CSSProperties
}

/** 來源連線點：顯示 +，點擊開啟可接對象浮動窗（仍可拖曳拉線） */
export function PlusHandle({
  nodeId,
  sourceKind,
  position,
  id,
  badge,
  style,
}: PlusHandleProps) {
  const openConnectPicker = useDialogueStore((s) => s.openConnectPicker)

  const onPlusClick = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    openConnectPicker({
      sourceId: nodeId,
      sourceHandle: id ?? null,
      sourceKind,
      clientX: e.clientX,
      clientY: e.clientY,
    })
  }

  return (
    <Handle
      type="source"
      position={position}
      id={id}
      style={style}
      className="plus-handle"
    >
      <button
        type="button"
        className="handle-plus-btn nodrag nopan"
        title="點擊選擇可連接的節點"
        aria-label={badge ? `連接選項 ${badge}` : '選擇連接目標'}
        onClick={onPlusClick}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {badge ? <span className="handle-plus-badge">{badge}</span> : null}
        <span className="handle-plus-mark">+</span>
      </button>
    </Handle>
  )
}

export { Position }
