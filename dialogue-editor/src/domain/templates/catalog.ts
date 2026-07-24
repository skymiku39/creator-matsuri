import type { Edge } from '@xyflow/react'
import type { BoothMeta, DialogueProject } from '../types'
import type { FlowNode } from '../flowGraph'
import { parseProjectJson } from '../projectIo'
import rabbitJson from './rabbitTeaParty.json'
import simpleFaqJson from './simpleFaq.json'
import multiLinkJson from './multiLink.json'
import blankStartJson from './blankStart.json'

export interface DialogueTemplate {
  id: string
  name: string
  description: string
  badge?: string
  load: () => {
    meta: BoothMeta
    nodes: FlowNode[]
    edges: Edge[]
  }
}

function fromProject(raw: unknown): {
  meta: BoothMeta
  nodes: FlowNode[]
  edges: Edge[]
} {
  const project = parseProjectJson(JSON.stringify(raw))
  return {
    meta: project.meta,
    nodes: project.nodes as FlowNode[],
    edges: project.edges as Edge[],
  }
}

export const DIALOGUE_TEMPLATES: DialogueTemplate[] = [
  {
    id: 'rabbit-tea-party',
    name: '兔子茶會 RabbitTeaParty',
    description: '創作者的文化祭攤位01官方範本，含五個選項與超連結。',
    badge: '官方範本',
    load: () => fromProject(rabbitJson as DialogueProject),
  },
  {
    id: 'simple-faq',
    name: '簡易問答',
    description: '兩句開場＋兩個選項，適合快速試作。',
    load: () => fromProject(simpleFaqJson as DialogueProject),
  },
  {
    id: 'multi-link',
    name: '多連結導覽',
    description: '選項可開啟外部網址，適合宣傳攤位。',
    load: () => fromProject(multiLinkJson as DialogueProject),
  },
  {
    id: 'blank-start',
    name: '空白起步',
    description: '最小可編輯骨架，自行填寫台詞。',
    load: () => fromProject(blankStartJson as DialogueProject),
  },
]

export function getTemplate(id: string): DialogueTemplate | undefined {
  return DIALOGUE_TEMPLATES.find((t) => t.id === id)
}
