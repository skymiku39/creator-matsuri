import { useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { AppNav } from '../components/layout/AppNav'
import { FlowCanvas } from '../components/FlowCanvas'
import { Inspector } from '../components/Inspector'
import { Toolbar } from '../components/Toolbar'
import { Toolbox } from '../components/Toolbox'
import { TemplateModal } from '../components/TemplateModal'
import { useDialogueStore } from '../store/useDialogueStore'

export function EditorPage() {
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const autoCompleteEnds = useDialogueStore((s) => s.autoCompleteEnds)

  return (
    <ReactFlowProvider>
      <div className="app-shell">
        <div className="app-header">
          <div className="top-bar">
            <AppNav />
            <div className="top-bar__actions">
              <button type="button" onClick={() => setTemplatesOpen(true)}>
                範本
              </button>
              <button
                type="button"
                onClick={() => {
                  const n = autoCompleteEnds()
                  alert(
                    n > 0
                      ? `已自動補上 ${n} 個結束節點。`
                      : '目前各分支都已有結束節點。',
                  )
                }}
              >
                自動補全結束
              </button>
            </div>
          </div>
          <Toolbar />
        </div>
        <div className="workspace">
          <Toolbox />
          <FlowCanvas />
          <Inspector />
        </div>
        <TemplateModal
          open={templatesOpen}
          onClose={() => setTemplatesOpen(false)}
        />
      </div>
    </ReactFlowProvider>
  )
}
