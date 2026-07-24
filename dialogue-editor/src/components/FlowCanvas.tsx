import { useCallback, useMemo } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useDialogueStore } from '../store/useDialogueStore'
import {
  ChoiceMenuNode,
  ChoiceNode,
  EndNode,
  MessageNode,
  UrlNode,
} from './nodes/DialogueNodes'

const nodeTypes: NodeTypes = {
  message: MessageNode,
  choiceMenu: ChoiceMenuNode,
  choice: ChoiceNode,
  url: UrlNode,
  end: EndNode,
}

export function FlowCanvas() {
  const nodes = useDialogueStore((s) => s.nodes)
  const edges = useDialogueStore((s) => s.edges)
  const onNodesChange = useDialogueStore((s) => s.onNodesChange)
  const onEdgesChange = useDialogueStore((s) => s.onEdgesChange)
  const onConnect = useDialogueStore((s) => s.onConnect)
  const select = useDialogueStore((s) => s.select)

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: { id: string }[] }) => {
      select(selected[0]?.id ?? null)
    },
    [select],
  )

  const proOptions = useMemo(() => ({ hideAttribution: true }), [])

  return (
    <div className="canvas-wrap">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        proOptions={proOptions}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background gap={22} size={1} color="rgba(40, 52, 48, 0.12)" />
        <Controls />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            switch (n.type) {
              case 'message':
                return '#2f6f5e'
              case 'choiceMenu':
                return '#b45309'
              case 'choice':
                return '#1d4e89'
              case 'url':
                return '#9a3412'
              case 'end':
                return '#57534e'
              default:
                return '#78716c'
            }
          }}
        />
      </ReactFlow>
    </div>
  )
}
