import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { DialogueNodeData } from '../../domain/types'
import { hasSpeakerOverride, resolveSpeakerName } from '../../domain/speaker'
import { useDialogueStore } from '../../store/useDialogueStore'
import { PlusHandle } from './PlusHandle'

type DialogueFlowNode = Node<DialogueNodeData>

export function MessageNode({ id, data, selected }: NodeProps<DialogueFlowNode>) {
  const meta = useDialogueStore((s) => s.meta)
  const speaker = resolveSpeakerName(meta, data)
  const overridden = hasSpeakerOverride(data)

  return (
    <div className={`flow-node message ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="target-handle" />
      <div className="flow-node__kind">對話</div>
      <div className={`flow-node__speaker${overridden ? ' flow-node__speaker--override' : ''}`}>
        {speaker}
      </div>
      <div className="flow-node__title">{data.title || '訊息'}</div>
      <p className="flow-node__preview">{data.text || '（空白）'}</p>
      <PlusHandle
        nodeId={id}
        sourceKind="message"
        position={Position.Bottom}
      />
    </div>
  )
}

export function ChoiceMenuNode({
  id,
  data,
  selected,
}: NodeProps<DialogueFlowNode>) {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F']
  return (
    <div className={`flow-node menu ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="target-handle" />
      <div className="flow-node__kind">選項選單</div>
      <div className="flow-node__title">{data.title || 'Show Choices'}</div>
      <p className="flow-node__hint">點右側 + 選擇要接的選項</p>
      <div className="menu-handles">
        {letters.map((letter, i) => (
          <PlusHandle
            key={letter}
            nodeId={id}
            sourceKind="choiceMenu"
            id={`opt-${letter}`}
            badge={letter}
            position={Position.Right}
            style={{ top: 44 + i * 22 }}
          />
        ))}
      </div>
    </div>
  )
}

export function ChoiceNode({ id, data, selected }: NodeProps<DialogueFlowNode>) {
  return (
    <div
      className={`flow-node choice ${selected ? 'selected' : ''} ${data.isReturn ? 'return' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="target-handle" />
      <div className="flow-node__kind">
        選項{data.isReturn ? ' · 返回' : ''}
      </div>
      <div className="flow-node__title">{data.text || '（未命名）'}</div>
      <PlusHandle nodeId={id} sourceKind="choice" position={Position.Bottom} />
    </div>
  )
}

export function UrlNode({ id, data, selected }: NodeProps<DialogueFlowNode>) {
  return (
    <div className={`flow-node url ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="target-handle" />
      <div className="flow-node__kind">超連結</div>
      <div className="flow-node__title">{data.text || 'https://'}</div>
      <PlusHandle nodeId={id} sourceKind="url" position={Position.Bottom} />
    </div>
  )
}

export function EndNode({ data, selected }: NodeProps<DialogueFlowNode>) {
  return (
    <div className={`flow-node end ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="target-handle" />
      <div className="flow-node__kind">結束</div>
      <div className="flow-node__title">{data.title || '結束／返回'}</div>
    </div>
  )
}
