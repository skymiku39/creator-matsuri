import rabbitCsv from './rabbitTeaParty.csv?raw'
import { parseCsvText } from '../importCsv'
import { rowsToFlow } from '../rowsToFlow'
import type { BoothMeta } from '../types'
import type { FlowNode } from '../exportCsv'
import type { Edge } from '@xyflow/react'

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

function fromCsv(csv: string, fallbackName: string): {
  meta: BoothMeta
  nodes: FlowNode[]
  edges: Edge[]
} {
  const parsed = parseCsvText(csv)
  const flow = rowsToFlow(parsed)
  return {
    meta: {
      boothId: parsed.boothId,
      boothName: parsed.boothName || fallbackName,
      locale: parsed.locale,
    },
    nodes: flow.nodes,
    edges: flow.edges,
  }
}

const simpleFaqCsv = `編號,說明,zh_TW,備註
,簡易問答攤位,,
02_Msg01,開場01,「歡迎光臨簡易問答攤位！」,
02_Msg02,開場02,「有什麼想問的嗎？」,
02_A_Name,選項A文字,活動時間,
02_A_Content01,選項A內容01,「活動從早上十點持續到晚上八點喔。」,
02_B_Name,選項B文字,等一下再過來,
02_B_Content01,選項B內容01,「好的，待會見～」,
`

const multiLinkCsv = `編號,說明,zh_TW,備註
,多連結攤位,,
03_Msg01,開場01,「這裡整理了幾個常用連結。」,
03_Msg02,開場02,「請選擇你想前往的地方。」,
03_A_Name,選項A文字,官方網站,
03_A_Content01,選項A內容01,「這是我們的官網，歡迎常來看看。」,
03_A_URL,選項A連結,https://example.com/official,此為超連結
03_B_Name,選項B文字,社群帳號,
03_B_Content01,選項B內容01,「最新消息都會發在這裡。」,
03_B_URL,選項B連結,https://example.com/social,此為超連結
03_C_Name,選項C文字,等一下再過來,
03_C_Content01,選項C內容01,「好，等等再來玩。」,
`

const blankCsv = `編號,說明,zh_TW,備註
,空白起步,,
04_Msg01,開場01,「……」（請改成你的開場白）,
04_A_Name,選項A文字,新選項,
04_A_Content01,選項A內容01,「請填寫回覆內容。」,
04_B_Name,選項B文字,等一下再過來,
04_B_Content01,選項B內容01,「好的，等等見。」,
`

export const DIALOGUE_TEMPLATES: DialogueTemplate[] = [
  {
    id: 'rabbit-tea-party',
    name: '兔子茶會 RabbitTeaParty',
    description: '創作者的文化祭攤位01官方範本，含五個選項與超連結。',
    badge: '官方範本',
    load: () => {
      const data = fromCsv(rabbitCsv, '01攤位')
      return {
        ...data,
        meta: { ...data.meta, speakerName: 'Mirai' },
      }
    },
  },
  {
    id: 'simple-faq',
    name: '簡易問答',
    description: '兩句開場＋兩個選項，適合快速試作。',
    load: () => {
      const data = fromCsv(simpleFaqCsv, '02攤位')
      return {
        ...data,
        meta: { ...data.meta, speakerName: '攤位店員' },
      }
    },
  },
  {
    id: 'multi-link',
    name: '多連結導覽',
    description: '選項可開啟外部網址，適合宣傳攤位。',
    load: () => {
      const data = fromCsv(multiLinkCsv, '03攤位')
      return {
        ...data,
        meta: { ...data.meta, speakerName: '導覽員' },
      }
    },
  },
  {
    id: 'blank-start',
    name: '空白起步',
    description: '最小可編輯骨架，自行填寫台詞。',
    load: () => {
      const data = fromCsv(blankCsv, '04攤位')
      return {
        ...data,
        meta: { ...data.meta, speakerName: 'NPC' },
      }
    },
  },
]

export function getTemplate(id: string): DialogueTemplate | undefined {
  return DIALOGUE_TEMPLATES.find((t) => t.id === id)
}
