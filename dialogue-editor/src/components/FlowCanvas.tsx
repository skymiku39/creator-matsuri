import { useCallback, useEffect, useMemo, type MouseEvent } from 'react'
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

const nodeTypes: NodeTypes = {
  message: MessageNode,
  choiceMenu: ChoiceMenuNode,
  choice: ChoiceNode,
  url: UrlNode,
  end: EndNode,
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

export function FlowCanvas() {
  const nodes = useDialogueStore((s) => s.nodes)
  const edges = useDialogueStore((s) => s.edges)
  const clipboard = useDialogueStore((s) => s.clipboard)
  const onNodesChange = useDialogueStore((s) => s.onNodesChange)
  const onEdgesChange = useDialogueStore((s) => s.onEdgesChange)
  const onConnect = useDialogueStore((s) => s.onConnect)
  const selectShiftRange = useDialogueStore((s) => s.selectShiftRange)
  const clearShiftAnchor = useDialogueStore((s) => s.clearShiftAnchor)
  const copySelection = useDialogueStore((s) => s.copySelection)
  const pasteClipboard = useDialogueStore((s) => s.pasteClipboard)
  const beginNodeDrag = useDialogueStore((s) => s.beginNodeDrag)
  const undo = useDialogueStore((s) => s.undo)
  const redo = useDialogueStore((s) => s.redo)
  const shiftAnchorId = useDialogueStore((s) => s.shiftAnchorId)

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: { id: string }[] }) => {
      const id = selected[0]?.id ?? null
      useDialogueStore.setState({ selectedId: id })
    },
    [],
  )

  const onNodeClick = useCallback(
    (event: MouseEvent, node: Node) => {
      if (event.shiftKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        event.stopPropagation()
        selectShiftRange(node.id)
        return
      }
      clearShiftAnchor()
    },
    [selectShiftRange, clearShiftAnchor],
  )

  const onPaneClick = useCallback(() => {
    clearShiftAnchor()
  }, [clearShiftAnchor])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return

      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        if (undo()) e.preventDefault()
        return
      }
      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        if (redo()) e.preventDefault()
        return
      }

      if (isTypingTarget(e.target)) return

      if (key === 'c') {
        if (copySelection()) e.preventDefault()
      }
      if (key === 'v') {
        if (pasteClipboard()) e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [copySelection, pasteClipboard, undo, redo])

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
  const selectedCount = nodes.filter((n) => n.selected).length

  return (
    <div className="canvas-wrap">
      <div className="canvas-hint" role="note">
        <kbd>Ctrl</kbd> 多選　
        <kbd>Shift</kbd> 同線起點→終點
        {shiftAnchorId ? '（已有起點，再點終點）' : ''}
        　
        <kbd>Ctrl</kbd>+<kbd>Z</kbd>/<kbd>Y</kbd> 復原重做　
        <kbd>Ctrl</kbd>+<kbd>C</kbd>/<kbd>V</kbd> 複製
        {clipboard ? `　（已複製 ${clipboard.nodes.length} 個）` : ''}
        {selectedCount > 1 ? `　已選 ${selectedCount}` : ''}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStart={() => beginNodeDrag()}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable
        nodesConnectable
        elementsSelectable
        selectionOnDrag={false}
        multiSelectionKeyCode={['Control', 'Meta']}
        selectionKeyCode={null}
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
