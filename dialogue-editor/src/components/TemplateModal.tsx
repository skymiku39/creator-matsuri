import { DIALOGUE_TEMPLATES } from '../domain/templates/catalog'
import { useDialogueStore } from '../store/useDialogueStore'

type Props = {
  open: boolean
  onClose: () => void
}

export function TemplateModal({ open, onClose }: Props) {
  const loadTemplate = useDialogueStore((s) => s.loadTemplate)

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-label="載入範本"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-panel__head">
          <h2>選擇範本</h2>
          <button type="button" className="modal-panel__close" onClick={onClose}>
            ×
          </button>
        </header>
        <p className="modal-panel__lead">
          一鍵載入預設流程（會覆蓋目前畫布，並自動補上結束節點）。
        </p>
        <ul className="template-grid">
          {DIALOGUE_TEMPLATES.map((tpl) => (
            <li key={tpl.id}>
              <button
                type="button"
                className="template-card"
                onClick={() => {
                  if (!confirm(`載入「${tpl.name}」會覆蓋目前內容，確定？`)) {
                    return
                  }
                  loadTemplate(tpl.id)
                  onClose()
                }}
              >
                <div className="template-card__title">
                  <strong>{tpl.name}</strong>
                  {tpl.badge ? <span className="badge">{tpl.badge}</span> : null}
                </div>
                <p>{tpl.description}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
