import type { DialogueNodeKind } from './types'

/** 來源節點 kind → 可連接的目標 kinds */
export const CONNECTION_ALLOWED: Record<DialogueNodeKind, DialogueNodeKind[]> = {
  message: ['message', 'choiceMenu', 'url', 'end'],
  choiceMenu: ['choice'],
  choice: ['message', 'url', 'end'],
  url: ['message', 'url', 'end'],
  end: [],
}

export const KIND_LABEL: Record<DialogueNodeKind, string> = {
  message: '對話',
  choiceMenu: '選項選單',
  choice: '選項',
  url: '超連結',
  end: '結束',
}

export function canConnectKinds(
  source: DialogueNodeKind,
  target: DialogueNodeKind,
): boolean {
  return CONNECTION_ALLOWED[source]?.includes(target) ?? false
}

export interface ConnectCandidate {
  id: string
  kind: DialogueNodeKind
  label: string
}

export function listConnectCandidates(
  sourceKind: DialogueNodeKind,
  sourceId: string,
  nodes: { id: string; data: { kind: DialogueNodeKind; title: string; text: string } }[],
): ConnectCandidate[] {
  const allowed = new Set(CONNECTION_ALLOWED[sourceKind] ?? [])
  return nodes
    .filter((n) => n.id !== sourceId && allowed.has(n.data.kind))
    .map((n) => ({
      id: n.id,
      kind: n.data.kind,
      label:
        n.data.title?.trim() ||
        n.data.text?.trim() ||
        KIND_LABEL[n.data.kind] ||
        n.id,
    }))
}
