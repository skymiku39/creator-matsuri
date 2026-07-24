import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { DialogueNodeData } from '../../domain/types'

type DialogueFlowNode = Node<DialogueNodeData>

export function MessageNode({ data, selected }: NodeProps<DialogueFlowNode>) {
  return (
    <div className={`flow-node message ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-node__kind">對話</div>
      <div className="flow-node__title">{data.title || '訊息'}</div>
      <p className="flow-node__preview">{data.text || '（空白）'}</p>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export function ChoiceMenuNode({ data, selected }: NodeProps<DialogueFlowNode>) {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F']
  return (
    <div className={`flow-node menu ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-node__kind">選項選單</div>
      <div className="flow-node__title">{data.title || 'Show Choices'}</div>
      <p className="flow-node__hint">由此拉出各選項分支</p>
      <div className="menu-handles">
        {letters.map((letter, i) => (
          <Handle
            key={letter}
            id={`opt-${letter}`}
            type="source"
            position={Position.Right}
            style={{ top: 48 + i * 18 }}
          />
        ))}
      </div>
    </div>
  )
}

export function ChoiceNode({ data, selected }: NodeProps<DialogueFlowNode>) {
  return (
    <div
      className={`flow-node choice ${selected ? 'selected' : ''} ${data.isReturn ? 'return' : ''}`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flow-node__kind">
        選項{data.isReturn ? ' · 返回' : ''}
      </div>
      <div className="flow-node__title">{data.text || '（未命名）'}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export function UrlNode({ data, selected }: NodeProps<DialogueFlowNode>) {
  return (
    <div className={`flow-node url ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-node__kind">超連結</div>
      <div className="flow-node__title">{data.text || 'https://'}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export function EndNode({ data, selected }: NodeProps<DialogueFlowNode>) {
  return (
    <div className={`flow-node end ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-node__kind">結束</div>
      <div className="flow-node__title">{data.title || '結束／返回'}</div>
    </div>
  )
}
