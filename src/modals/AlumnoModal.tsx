import { useState, useEffect } from 'react'
import Form   from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'
import { Modal }         from '../components/Modal'
import { ConfirmModal } from '../components/ConfirmModal'
import { useStore }    from '../lib/store'
import { toTitleCase } from '../lib/utils'

interface Props {
  open: boolean
  editId: string | null
  onClose: () => void
  onToast: (msg: string) => void
}

interface FormState {
  nombre: string
  tel:    string
}

const blank = (): FormState => ({ nombre: '', tel: '' })

export function AlumnoModal({ open, editId, onClose, onToast }: Props) {
  const { state: { alumnos }, saveAlumno, deleteAlumno } = useStore()
  const [form,   setForm]   = useState<FormState>(blank())
  const [saving,  setSaving]  = useState(false)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editId) {
      const a = alumnos.find(x => x.id === editId)
      if (a) { setForm({ nombre: a.nombre, tel: a.tel ?? '' }); return }
    }
    setForm(blank())
  }, [open, editId, alumnos])

  function set(k: keyof FormState, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave() {
    if (!form.nombre.trim()) { onToast('Ingresá el nombre'); return }
    setSaving(true)
    try {
      const existing = editId ? alumnos.find(a => a.id === editId) : undefined
      await saveAlumno({
        id:       editId || undefined,
        nombre:   toTitleCase(form.nombre),
        tel:      form.tel.trim(),
        email:    existing?.email  ?? '',
        tipo:     existing?.tipo   ?? 'grupal',
        clases:   existing?.clases ?? 4,
        inicio:   existing?.inicio ?? new Date().toISOString().split('T')[0],
        pago:     existing?.pago   ?? 'pagado',
        notas:    existing?.notas  ?? '',
      })
      onToast(editId ? 'Alumno actualizado ✓' : 'Alumno guardado ✓')
      onClose()
    } catch {
      onToast('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editId) return
    setSaving(true)
    try {
      await deleteAlumno(editId)
      onToast('Alumno eliminado')
      onClose()
    } catch {
      onToast('Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editId ? 'Editar alumno' : 'Nuevo alumno'}>
      <Form.Group className="mb-3">
        <Form.Label className="small fw-bold">Nombre</Form.Label>
        <Form.Control
          value={form.nombre}
          onChange={e => set('nombre', e.target.value)}
          placeholder="Nombre"
          autoFocus
        />
      </Form.Group>

      <Form.Group className="mb-4">
        <Form.Label className="small fw-bold">Teléfono / WhatsApp</Form.Label>
        <Form.Control
          type="tel"
          value={form.tel}
          onChange={e => set('tel', e.target.value)}
          placeholder="+54 341..."
        />
      </Form.Group>

      <Button variant="primary" className="w-100 fw-bold" onClick={handleSave} disabled={saving}>
        {saving ? 'Guardando...' : editId ? 'Guardar cambios' : '+ Agregar alumno'}
      </Button>

      {editId && (
        <Button variant="outline-danger" className="w-100 mt-2" onClick={() => setConfirm(true)} disabled={saving}>
          Eliminar alumno
        </Button>
      )}
      <ConfirmModal
        open={confirm}
        title="Eliminar alumno"
        message="¿Eliminar este alumno? Se quitará de todos sus turnos y la acción no se puede deshacer."
        onConfirm={() => { setConfirm(false); handleDelete() }}
        onCancel={() => setConfirm(false)}
      />
    </Modal>
  )
}
