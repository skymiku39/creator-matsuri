import { useMemo, useRef } from 'react'
import {
  downloadText,
  parseProjectJson,
  serializeProject,
} from '../domain/projectIo'
import { validateFlow } from '../domain/validate'
import { useDialogueStore } from '../store/useDialogueStore'
import { normalizeBoothId } from '../domain/types'
import type { FlowNode } from '../domain/flowGraph'
import type { Edge } from '@xyflow/react'

export function Toolbar() {
  const meta = useDialogueStore((s) => s.meta)
  const nodes = useDialogueStore((s) => s.nodes)
  const edges = useDialogueStore((s) => s.edges)
  const setMeta = useDialogueStore((s) => s.setMeta)
  const loadProject = useDialogueStore((s) => s.loadProject)
  const resetStarter = useDialogueStore((s) => s.resetStarter)
  const select = useDialogueStore((s) => s.select)
  const fileRef = useRef<HTMLInputElement>(null)

  const issues = useMemo(() => validateFlow(nodes, edges), [nodes, edges])

  const exportJson = () => {
    const boothId = normalizeBoothId(meta.boothId)
    downloadText(
      `booth_${boothId}_flow.json`,
      serializeProject(meta, nodes, edges),
      'application/json',
    )
  }

  const onFile = async (file: File) => {
    try {
      if (!file.name.toLowerCase().endsWith('.json')) {
        alert('請選擇專案 JSON 檔（.json）')
        return
      }
      const text = await file.text()
      const project = parseProjectJson(text)
      loadProject(
        project.meta,
        project.nodes as FlowNode[],
        project.edges as Edge[],
      )
    } catch (err) {
      console.error(err)
      alert(`匯入失敗：${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <header className="toolbar">
      <div className="brand-block">
        <p className="brand">創作者的文化祭</p>
        <h1>攤位台詞流程編輯器</h1>
      </div>

      <div className="toolbar-controls">
        <div className="toolbar-meta-row">
          <label className="field inline">
            <span>攤位編號</span>
            <input
              value={meta.boothId}
              onChange={(e) => {
                setMeta({ boothId: e.target.value.replace(/[^\d]/g, '') })
              }}
              onBlur={() =>
                setMeta({
                  boothId: normalizeBoothId(meta.boothId || '01'),
                })
              }
            />
          </label>
          <label className="field inline">
            <span>攤位名稱</span>
            <input
              value={meta.boothName}
              onChange={(e) => setMeta({ boothName: e.target.value })}
            />
          </label>
          <label className="field inline">
            <span>預設說話者</span>
            <input
              value={meta.speakerName ?? ''}
              placeholder="攤位店員"
              onChange={(e) => setMeta({ speakerName: e.target.value })}
            />
          </label>
        </div>

        <div className="btn-row">
          <button
            type="button"
            onClick={() => {
              if (
                nodes.length > 0 &&
                !confirm('匯入會覆蓋目前畫布，確定繼續？')
              ) {
                return
              }
              fileRef.current?.click()
            }}
          >
            匯入 JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onFile(f)
              e.target.value = ''
            }}
          />
          <button type="button" className="primary" onClick={exportJson}>
            匯出 JSON
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('確定重置為空白起步流程？未匯出內容將遺失。')) {
                resetStarter()
              }
            }}
          >
            重置
          </button>
        </div>

        {issues.length > 0 && (
          <ul className="issues" title="驗證訊息（可捲動）">
            {issues.map((issue, i) => (
              <li key={i} className={issue.level}>
                <button
                  type="button"
                  className="issue-btn"
                  onClick={() => issue.nodeId && select(issue.nodeId)}
                >
                  {issue.level === 'error' ? '錯誤' : '注意'}：{issue.message}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  )
}
