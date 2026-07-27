import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react'
import {
  normalizeBoothId,
  type BoothMeta,
  type DialogueNodeData,
  type DialogueNodeKind,
} from '../domain/types'
import type { FlowNode } from '../domain/flowGraph'
import type { ConnectPickerState } from './connectPickerTypes'
import { CONNECTION_ALLOWED } from '../domain/connectionRules'
import { nextId, syncIdCounterFromGraph } from './idFactory'
import { autoCompleteEndNodes } from '../domain/autoCompleteEnd'
import { getTemplate } from '../domain/templates/catalog'
import {
  captureSelection,
  pasteSelectionDuplicate,
  type SelectionClipboard,
} from '../domain/selectionClipboard'
import { setIncomingLink, setOutgoingLink } from '../domain/linkEdit'
import { linearSegmentInterval } from '../domain/linearSegment'
import {
  clearHistory,
  commitDebounced,
  commitNow,
  redo as historyRedo,
  takeSnapshot,
  undo as historyUndo,
} from './editHistory'

export { nextId, syncIdCounterFromGraph } from './idFactory'

function currentSnapshot(state: {
  meta: BoothMeta
  nodes: FlowNode[]
  edges: Edge[]
}) {
  return takeSnapshot(state.meta, state.nodes, state.edges)
}

const defaultMeta: BoothMeta = {
  boothId: '01',
  boothName: '01攤位',
  locale: 'zh_TW',
}

function withSelection(
  nodes: FlowNode[],
  selectedIds: Set<string> | string | null,
): FlowNode[] {
  const set =
    selectedIds == null
      ? new Set<string>()
      : typeof selectedIds === 'string'
        ? new Set([selectedIds])
        : selectedIds
  return nodes.map((n) => ({
    ...n,
    selected: set.has(n.id),
  }))
}

function defaultNodeData(kind: DialogueNodeKind): DialogueNodeData {
  const defaults: Record<DialogueNodeKind, DialogueNodeData> = {
    message: {
      kind: 'message',
      title: '新對話',
      text: '「……」',
      note: '',
    },
    choiceMenu: {
      kind: 'choiceMenu',
      title: '對話選項',
      text: '',
      note: '建議包含返回選項',
    },
    choice: {
      kind: 'choice',
      title: '新選項',
      text: '選項文字',
      note: '',
      isReturn: false,
    },
    url: {
      kind: 'url',
      title: '超連結',
      text: 'https://',
      note: '此為超連結',
    },
    end: {
      kind: 'end',
      title: '結束／返回',
      text: '',
      note: '',
    },
  }
  return defaults[kind]
}

function starterFlow(): { nodes: FlowNode[]; edges: Edge[] } {
  const m1: FlowNode = {
    id: 'msg_1',
    type: 'message',
    position: { x: 120, y: 60 },
    data: {
      kind: 'message',
      title: '開場01',
      text: '「你好啊~」',
      note: '',
    },
  }
  const m2: FlowNode = {
    id: 'msg_2',
    type: 'message',
    position: { x: 120, y: 180 },
    data: {
      kind: 'message',
      title: '開場02',
      text: '「那麼關於本次活動你想問什麼呢？」',
      note: '',
    },
  }
  const menu: FlowNode = {
    id: 'menu_1',
    type: 'choiceMenu',
    position: { x: 120, y: 300 },
    data: {
      kind: 'choiceMenu',
      title: '對話選項',
      text: '',
      note: '建議包含返回選項',
    },
  }
  const choiceA: FlowNode = {
    id: 'choice_1',
    type: 'choice',
    position: { x: 420, y: 200 },
    data: {
      kind: 'choice',
      title: '選項A',
      text: '新選項',
      note: '',
      isReturn: false,
    },
  }
  const choiceAMsg: FlowNode = {
    id: 'msg_3',
    type: 'message',
    position: { x: 420, y: 320 },
    data: {
      kind: 'message',
      title: '選項A內容',
      text: '「……」',
      note: '',
    },
  }
  const choiceE: FlowNode = {
    id: 'choice_2',
    type: 'choice',
    position: { x: 700, y: 200 },
    data: {
      kind: 'choice',
      title: '選項E',
      text: '等一下再過來',
      note: '',
      isReturn: true,
    },
  }
  const choiceEMsg: FlowNode = {
    id: 'msg_4',
    type: 'message',
    position: { x: 700, y: 320 },
    data: {
      kind: 'message',
      title: '選項E內容',
      text: '「好的，等等見。」',
      note: '',
    },
  }
  const endE: FlowNode = {
    id: 'end_1',
    type: 'end',
    position: { x: 700, y: 440 },
    data: {
      kind: 'end',
      title: '結束／返回',
      text: '',
      note: '',
    },
  }
  return {
    nodes: [m1, m2, menu, choiceA, choiceAMsg, choiceE, choiceEMsg, endE],
    edges: [
      { id: 'e_1', source: 'msg_1', target: 'msg_2' },
      { id: 'e_2', source: 'msg_2', target: 'menu_1' },
      {
        id: 'e_3',
        source: 'menu_1',
        target: 'choice_1',
        sourceHandle: 'opt-A',
      },
      { id: 'e_4', source: 'choice_1', target: 'msg_3' },
      {
        id: 'e_5',
        source: 'menu_1',
        target: 'choice_2',
        sourceHandle: 'opt-E',
      },
      { id: 'e_6', source: 'choice_2', target: 'msg_4' },
      { id: 'e_7', source: 'msg_4', target: 'end_1' },
    ],
  }
}

interface DialogueState {
  meta: BoothMeta
  nodes: FlowNode[]
  edges: Edge[]
  selectedId: string | null
  /** Shift 範圍選取的第一個方塊 */
  shiftAnchorId: string | null
  /**
   * Shift 同線區間選取結果（含起點與終點）。
   * 鎖定期間忽略 React Flow 的單點 select，避免只剩終點被選。
   */
  shiftPathIds: string[] | null
  /** Ctrl+C 暫存；不寫入 localStorage */
  clipboard: SelectionClipboard | null
  connectPicker: ConnectPickerState | null
  characterModalOpen: boolean
  openCharacterModal: () => void
  closeCharacterModal: () => void
  setMeta: (patch: Partial<BoothMeta>) => void
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  select: (id: string | null) => void
  clearShiftAnchor: () => void
  /**
   * Shift：第一次點＝起點；第二次點＝終點。
   * 僅在同一條單線對話串上選取閉區間（含兩端）；否則改以第二點為新起點。
   */
  selectShiftRange: (nodeId: string) => void
  updateNodeData: (id: string, patch: Partial<DialogueNodeData>) => void
  addNode: (kind: DialogueNodeKind) => void
  removeSelected: () => void
  loadProject: (meta: BoothMeta, nodes: FlowNode[], edges: Edge[]) => void
  resetStarter: () => void
  openConnectPicker: (state: ConnectPickerState) => void
  closeConnectPicker: () => void
  connectFromPicker: (targetId: string) => void
  createAndConnectFromPicker: (kind: DialogueNodeKind) => void
  autoCompleteEnds: () => number
  loadTemplate: (templateId: string) => boolean
  copySelection: () => boolean
  pasteClipboard: () => boolean
  setIncoming: (nodeId: string, parentId: string | null) => string | null
  setOutgoing: (
    nodeId: string,
    childId: string | null,
    sourceHandle?: string | null,
  ) => string | null
  /** 將說話者套用到指定節點（支援多選） */
  assignSpeaker: (
    nodeIds: string[],
    patch: Pick<DialogueNodeData, 'speakerId' | 'speakerName'>,
  ) => void
  /** 刪除人物並清掉節點引用 */
  removeCharacter: (characterId: string) => void
  /** 拖曳節點開始前入棧，供還原位置 */
  beginNodeDrag: () => void
  undo: () => boolean
  redo: () => boolean
}

const initial = starterFlow()
syncIdCounterFromGraph(initial.nodes, initial.edges)

export const useDialogueStore = create<DialogueState>()(
  persist(
    (set, get) => ({
      meta: defaultMeta,
      nodes: initial.nodes,
      edges: initial.edges,
      selectedId: null,
      shiftAnchorId: null,
      shiftPathIds: null,
      clipboard: null,
      connectPicker: null,
      characterModalOpen: false,

      openCharacterModal: () => set({ characterModalOpen: true }),
      closeCharacterModal: () => set({ characterModalOpen: false }),

      setMeta: (patch) => {
        commitDebounced(currentSnapshot(get()))
        const current = get().meta
        const next = { ...current, ...patch }
        if (patch.boothId != null) {
          next.boothId = String(patch.boothId).replace(/\D/g, '')
          const prevAuto = `${normalizeBoothId(current.boothId || '01')}攤位`
          if (!patch.boothName && current.boothName === prevAuto && next.boothId) {
            next.boothName = `${normalizeBoothId(next.boothId)}攤位`
          }
        }
        set({ meta: next })
      },

      onNodesChange: (changes) => {
        const structural = changes.some(
          (c) => c.type === 'remove' || c.type === 'add',
        )
        if (structural) {
          commitNow(currentSnapshot(get()))
        }
        const locked = get().shiftPathIds
        // 鎖定路徑選取時，丟掉 RF 的 select 變更，避免只剩終點
        const applied = locked
          ? changes.filter((c) => c.type !== 'select')
          : changes
        let nodes = applyNodeChanges(applied, get().nodes) as FlowNode[]
        if (locked && locked.length > 0) {
          nodes = withSelection(nodes, new Set(locked))
        }
        const selectedFromRf =
          locked?.[locked.length - 1] ??
          nodes.find((n) => n.selected)?.id ??
          null
        set({ nodes, selectedId: selectedFromRf })
      },

      onEdgesChange: (changes) => {
        if (changes.some((c) => c.type === 'remove' || c.type === 'add')) {
          commitNow(currentSnapshot(get()))
        }
        set({ edges: applyEdgeChanges(changes, get().edges) })
      },

      onConnect: (connection) => {
        const { nodes, edges } = get()
        const source = nodes.find((n) => n.id === connection.source)
        if (!source || !connection.target) return

        commitNow(currentSnapshot(get()))
        let nextEdges = edges
        if (source.data.kind === 'choiceMenu') {
          nextEdges = edges.filter(
            (e) =>
              !(
                e.source === connection.source &&
                e.sourceHandle === connection.sourceHandle
              ),
          )
        } else {
          nextEdges = edges.filter((e) => e.source !== connection.source)
        }

        set({
          edges: addEdge({ ...connection, id: nextId('e') }, nextEdges),
        })
      },

      select: (id) =>
        set({
          selectedId: id,
          shiftAnchorId: null,
          shiftPathIds: null,
          nodes: withSelection(get().nodes, id),
        }),

      clearShiftAnchor: () =>
        set({ shiftAnchorId: null, shiftPathIds: null }),

      selectShiftRange: (nodeId) => {
        const { nodes, edges, shiftAnchorId } = get()

        // 第一次：只選起點
        if (!shiftAnchorId || shiftAnchorId === nodeId) {
          const path = [nodeId]
          set({
            shiftAnchorId: nodeId,
            shiftPathIds: path,
            selectedId: nodeId,
            nodes: withSelection(nodes, nodeId),
          })
          return
        }

        const interval = linearSegmentInterval(
          shiftAnchorId,
          nodeId,
          nodes,
          edges,
        )
        if (!interval || interval.length === 0) {
          // 不在同一單線：改以新點當起點
          const fallback = [nodeId]
          set({
            shiftAnchorId: nodeId,
            shiftPathIds: fallback,
            selectedId: nodeId,
            nodes: withSelection(nodes, nodeId),
          })
          return
        }

        set({
          shiftPathIds: interval,
          selectedId: nodeId,
          nodes: withSelection(nodes, new Set(interval)),
        })
      },

      updateNodeData: (id, patch) => {
        commitDebounced(currentSnapshot(get()))
        set({
          nodes: get().nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
          ),
        })
        if (patch.isReturn === true) {
          get().autoCompleteEnds()
        }
      },

      addNode: (kind) => {
        commitNow(currentSnapshot(get()))
        const id = nextId(kind)
        const node: FlowNode = {
          id,
          type: kind,
          position: {
            x: 160 + Math.random() * 240,
            y: 80 + Math.random() * 280,
          },
          data: defaultNodeData(kind),
          selected: true,
        }
        set({
          nodes: withSelection([...get().nodes, node], id),
          selectedId: id,
        })
      },

      removeSelected: () => {
        const selected = get().nodes.filter((n) => n.selected).map((n) => n.id)
        const ids = new Set(
          selected.length > 0
            ? selected
            : get().selectedId
              ? [get().selectedId!]
              : [],
        )
        if (ids.size === 0) return
        commitNow(currentSnapshot(get()))
        set({
          nodes: get().nodes.filter((n) => !ids.has(n.id)),
          edges: get().edges.filter(
            (e) => !ids.has(e.source) && !ids.has(e.target),
          ),
          selectedId: null,
        })
      },

      loadProject: (meta, nodes, edges) => {
        clearHistory()
        syncIdCounterFromGraph(nodes, edges)
        set({
          meta: { ...meta, boothId: normalizeBoothId(meta.boothId) },
          nodes,
          edges,
          selectedId: null,
          connectPicker: null,
          clipboard: null,
          shiftAnchorId: null,
          shiftPathIds: null,
        })
      },

      resetStarter: () => {
        clearHistory()
        const flow = starterFlow()
        syncIdCounterFromGraph(flow.nodes, flow.edges)
        set({
          meta: defaultMeta,
          nodes: flow.nodes,
          edges: flow.edges,
          selectedId: null,
          connectPicker: null,
          clipboard: null,
          shiftAnchorId: null,
          shiftPathIds: null,
        })
      },

      openConnectPicker: (state) => set({ connectPicker: state }),
      closeConnectPicker: () => set({ connectPicker: null }),

      connectFromPicker: (targetId) => {
        const picker = get().connectPicker
        if (!picker) return
        get().onConnect({
          source: picker.sourceId,
          target: targetId,
          sourceHandle: picker.sourceHandle,
          targetHandle: null,
        })
        set({ connectPicker: null })
      },

      createAndConnectFromPicker: (kind) => {
        const picker = get().connectPicker
        if (!picker) return
        if (!CONNECTION_ALLOWED[picker.sourceKind].includes(kind)) return

        commitNow(currentSnapshot(get()))
        const source = get().nodes.find((n) => n.id === picker.sourceId)
        const id = nextId(kind)
        const node: FlowNode = {
          id,
          type: kind,
          position: {
            x: (source?.position.x ?? 160) + (picker.sourceKind === 'choiceMenu' ? 280 : 0),
            y: (source?.position.y ?? 80) + (picker.sourceKind === 'choiceMenu' ? 0 : 140),
          },
          data: defaultNodeData(kind),
          selected: true,
        }

        let nextEdges = get().edges
        if (picker.sourceKind === 'choiceMenu') {
          nextEdges = nextEdges.filter(
            (e) =>
              !(
                e.source === picker.sourceId &&
                e.sourceHandle === picker.sourceHandle
              ),
          )
        } else {
          nextEdges = nextEdges.filter((e) => e.source !== picker.sourceId)
        }
        nextEdges = addEdge(
          {
            source: picker.sourceId,
            target: id,
            sourceHandle: picker.sourceHandle,
            targetHandle: null,
            id: nextId('e'),
          },
          nextEdges,
        )

        set({
          nodes: withSelection([...get().nodes, node], id),
          edges: nextEdges,
          selectedId: id,
          connectPicker: null,
        })
      },

      autoCompleteEnds: () => {
        const result = autoCompleteEndNodes(get().nodes, get().edges)
        if (result.added > 0) {
          commitNow(currentSnapshot(get()))
          syncIdCounterFromGraph(result.nodes, result.edges)
          set({ nodes: result.nodes, edges: result.edges })
        }
        return result.added
      },

      loadTemplate: (templateId) => {
        const tpl = getTemplate(templateId)
        if (!tpl) return false
        clearHistory()
        const loaded = tpl.load()
        syncIdCounterFromGraph(loaded.nodes, loaded.edges)
        const completed = autoCompleteEndNodes(loaded.nodes, loaded.edges)
        syncIdCounterFromGraph(completed.nodes, completed.edges)
        set({
          meta: loaded.meta,
          nodes: completed.nodes,
          edges: completed.edges,
          selectedId: null,
          connectPicker: null,
          clipboard: null,
          shiftAnchorId: null,
          shiftPathIds: null,
        })
        return true
      },

      copySelection: () => {
        const selectedIds = get()
          .nodes.filter((n) => n.selected)
          .map((n) => n.id)
        const ids =
          selectedIds.length > 0
            ? selectedIds
            : get().selectedId
              ? [get().selectedId!]
              : []
        const clip = captureSelection(ids, get().nodes, get().edges)
        if (!clip) return false
        set({ clipboard: clip })
        return true
      },

      pasteClipboard: () => {
        const clip = get().clipboard
        if (!clip) return false
        commitNow(currentSnapshot(get()))
        const result = pasteSelectionDuplicate(clip, get().nodes, get().edges)
        syncIdCounterFromGraph(result.nodes, result.edges)
        set({
          nodes: result.nodes,
          edges: result.edges,
          selectedId: result.newIds[0] ?? null,
        })
        return true
      },

      setIncoming: (nodeId, parentId) => {
        const result = setIncomingLink(
          nodeId,
          parentId,
          get().nodes,
          get().edges,
        )
        if (!result.ok) return result.reason ?? '無法設定前驅'
        commitNow(currentSnapshot(get()))
        syncIdCounterFromGraph(result.nodes, result.edges)
        set({ edges: result.edges })
        return null
      },

      setOutgoing: (nodeId, childId, sourceHandle) => {
        const result = setOutgoingLink(
          nodeId,
          childId,
          get().nodes,
          get().edges,
          sourceHandle,
        )
        if (!result.ok) return result.reason ?? '無法設定後繼'
        commitNow(currentSnapshot(get()))
        syncIdCounterFromGraph(result.nodes, result.edges)
        set({ edges: result.edges })
        return null
      },

      assignSpeaker: (nodeIds, patch) => {
        const ids = new Set(nodeIds)
        if (ids.size === 0) return
        commitNow(currentSnapshot(get()))
        set({
          nodes: get().nodes.map((n) =>
            ids.has(n.id)
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    speakerId: patch.speakerId,
                    speakerName: patch.speakerName,
                  },
                }
              : n,
          ),
        })
      },

      removeCharacter: (characterId) => {
        commitNow(currentSnapshot(get()))
        const characters = (get().meta.characters ?? []).filter(
          (c) => c.id !== characterId,
        )
        set({
          meta: { ...get().meta, characters },
          nodes: get().nodes.map((n) =>
            n.data.speakerId === characterId
              ? { ...n, data: { ...n.data, speakerId: undefined } }
              : n,
          ),
        })
      },

      beginNodeDrag: () => {
        commitNow(currentSnapshot(get()))
      },

      undo: () => {
        const prev = historyUndo(currentSnapshot(get()))
        if (!prev) return false
        syncIdCounterFromGraph(prev.nodes, prev.edges)
        set({
          meta: prev.meta,
          nodes: prev.nodes,
          edges: prev.edges,
          selectedId: null,
          shiftAnchorId: null,
          shiftPathIds: null,
          connectPicker: null,
        })
        return true
      },

      redo: () => {
        const next = historyRedo(currentSnapshot(get()))
        if (!next) return false
        syncIdCounterFromGraph(next.nodes, next.edges)
        set({
          meta: next.meta,
          nodes: next.nodes,
          edges: next.edges,
          selectedId: null,
          shiftAnchorId: null,
          shiftPathIds: null,
          connectPicker: null,
        })
        return true
      },
    }),
    {
      name: 'creator-matsuri-dialogue-v1',
      partialize: (state) => ({
        meta: state.meta,
        nodes: state.nodes,
        edges: state.edges,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.nodes && state?.edges) {
          syncIdCounterFromGraph(state.nodes, state.edges)
        }
      },
    },
  ),
)
