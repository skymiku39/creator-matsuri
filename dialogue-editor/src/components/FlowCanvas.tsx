import { useCallback, useMemo, type MouseEvent } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type Node,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useDialogueStore } from '../store/useDialogueStore'
import { canConnectKinds } from '../domain/connectionRules'
import { ConnectPicker } from './ConnectPicker'
import {
  ChoiceMenuNode,
  ChoiceNode,
  EndNode,
  MessageNode,
  UrlNode,
} from './nodes/DialogueNodes'
import type { FlowNode } from '../domain/flowGraph'

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
  const clipboard = useDialogueStore((s) => s.clipboard)
  const onNodesChange = useDialogueStore((s) => s.onNodesChange)
  const onEdgesChange = useDialogueStore((s) => s.onEdgesChange)
  const onConnect = useDialogueStore((s) => s.onConnect)
  const handleModifierNodeClick = useDialogueStore((s) => s.handleModifierNodeClick)
  const clearClipboard = useDialogueStore((s) => s.clearClipboard)

  const displayNodes = useMemo(() => {
    const sourceSet = new Set(clipboard?.nodeIds ?? [])
    return nodes.map((n) => ({
      ...n,
      className: [
        n.className,
        sourceSet.has(n.id) ? 'is-clipboard-source' : '',
        clipboard?.anchorId === n.id ? 'is-clipboard-anchor' : '',
      ]
        .filter(Boolean)
        .join(' '),
    }))
  }, [nodes, clipboard])

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: { id: string }[] }) => {
      const id = selected[0]?.id ?? null
      useDialogueStore.setState({ selectedId: id })
    },
    [],
  )

  const onNodeClick = useCallback(
    (event: MouseEvent, node: Node) => {
      if (event.shiftKey) {
        event.preventDefault()
        const result = handleModifierNodeClick('segment', node.id)
        if (result.message) alert(result.message)
        return
      }
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        const result = handleModifierNodeClick('single', node.id)
        if (result.message) alert(result.message)
      }
    },
    [handleModifierNodeClick],
  )

  const onPaneClick = useCallback(() => {
    clearClipboard()
  }, [clearClipboard])

  const isValidConnection = useCallback(
    (connection: Connection | { source: string | null; target: string | null }) => {
      if (!connection.source) return false
      if (!connection.target) return true

      const source = nodes.find((n) => n.id === connection.source)
      const target = nodes.find((n) => n.id === connection.target)
      if (!source || !target) return false
      if (source.id === target.id) return false
      return canConnectKinds(source.data.kind, target.data.kind)
    },
    [nodes],
  )

  const proOptions = useMemo(() => ({ hideAttribution: true }), [])

  return (
    <div className="canvas-wrap">
      {clipboard && (
        <div className="clipboard-banner" role="status">
          {clipboard.mode === 'segment'
            ? 'Shift：已選線性片段為來源，再 Shift 點其他節點貼上（再點來源取消）'
            : 'Ctrl：已選單一節點為來源，再 Ctrl 點同類型節點貼上文字（再點來源取消）'}
          <button type="button" onClick={clearClipboard}>
            取消
          </button>
        </div>
      )}
      <ReactFlow
        nodes={displayNodes as FlowNode[]}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable
        nodesConnectable
        elementsSelectable
        multiSelectionKeyCode={null}
        proOptions={proOptions}
        deleteKeyCode={['Backspace', 'Delete']}
        connectionRadius={28}
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
      <ConnectPicker />
    </div>
  )
}
