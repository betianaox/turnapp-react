import BSModal from 'react-bootstrap/Modal'
import Button  from 'react-bootstrap/Button'

interface Props {
  open:          boolean
  title:         string
  message:       string
  onConfirm:     () => void
  onCancel:      () => void
  confirmLabel?: string
}

export function ConfirmModal({ open, title, message, onConfirm, onCancel, confirmLabel = 'Eliminar' }: Props) {
  return (
    <BSModal show={open} onHide={onCancel} centered size="sm">
      <BSModal.Header closeButton>
        <BSModal.Title className="fs-6 fw-bold">{title}</BSModal.Title>
      </BSModal.Header>
      <BSModal.Body>
        <p className="mb-0 text-muted" style={{ fontSize: 14 }}>{message}</p>
      </BSModal.Body>
      <BSModal.Footer className="py-2">
        <Button variant="outline-secondary" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button variant="danger" size="sm" onClick={onConfirm}>{confirmLabel}</Button>
      </BSModal.Footer>
    </BSModal>
  )
}
