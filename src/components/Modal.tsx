import BSModal from 'react-bootstrap/Modal'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: Props) {
  return (
    <BSModal show={open} onHide={onClose} scrollable fullscreen="sm-down" centered>
      <BSModal.Header closeButton>
        <BSModal.Title className="fs-6 fw-bold">{title}</BSModal.Title>
      </BSModal.Header>
      <BSModal.Body>{children}</BSModal.Body>
    </BSModal>
  )
}
