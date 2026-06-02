import { useState, useEffect, useRef } from 'react'
import Form   from 'react-bootstrap/Form'
import Row    from 'react-bootstrap/Row'
import Col    from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'
import Badge  from 'react-bootstrap/Badge'
import { Modal }         from '../components/Modal'
import { ConfirmModal } from '../components/ConfirmModal'
import { useStore } from '../lib/store'
import { HOURS } from '../constants'
import type { TipoClase } from '../types'

interface Props {
  open: boolean; editId: string | null
  prefillDia?: number; prefillHora?: string; prefillCancha?: number; prefillFecha?: string
  onClose: () => void; onToast: (msg: string) => void
}

interface FormState {
  cancha: number; dia: number; hora: string
  tipo: TipoClase; fijo: boolean; fecha: string; notas: string
}

const blank = (dia?: number, hora?: string, cancha?: number, fecha?: string): FormState => ({
  cancha: cancha ?? 1, dia: dia ?? 1, hora: hora ?? '08:00',
  tipo: 'grupal', fijo: true, fecha: fecha ?? '', notas: '',
})

export function TurnoModal({ open, editId, prefillDia, prefillHora, prefillCancha, prefillFecha, onClose, onToast }: Props) {
  const { state: { alumnos, turnos }, saveTurno, deleteTurno } = useStore()
  const [form,         setForm]      = useState<FormState>(blank())
  const [selectedIds,  setSelected]  = useState<string[]>([])
  const [pickerSearch, setPickerSearch] = useState('')
  const [saving,       setSaving]    = useState(false)
  const [confirm,      setConfirm]   = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setSelected([])
    setPickerSearch('')
    if (editId) {
      const t = turnos.find(x => x.id === editId)
      if (t) {
        setForm({ cancha: t.cancha, dia: t.dia, hora: t.hora, tipo: t.tipo, fijo: t.fijo ?? true, fecha: t.fecha ?? '', notas: t.notas })
        setSelected([...t.alumnoIds])
        return
      }
    }
    setForm(blank(prefillDia, prefillHora, prefillCancha, prefillFecha))
  }, [open, editId, prefillDia, prefillHora, prefillCancha, turnos])

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  const isGrupal = form.tipo === 'grupal'
  const maxSel   = isGrupal ? 4 : 1

  // ¿El turno siendo editado es un bloqueo?
  const isEditingBloqueo = !!editId && turnos.find(t => t.id === editId)?.tipo === 'bloqueo'

  function conflictFor(id: string) {
    return turnos.find(t =>
      t.dia === form.dia && t.hora === form.hora &&
      t.alumnoIds.includes(id) && t.id !== editId
    ) ?? null
  }

  function toggleAlumno(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= maxSel) {
        onToast(`Máximo ${maxSel} ${maxSel === 1 ? 'alumno' : 'alumnos'} para este tipo`)
        return prev
      }
      const conflict = conflictFor(id)
      if (conflict) {
        const nombre = alumnos.find(a => a.id === id)?.nombre ?? 'Este alumno'
        onToast(`${nombre} ya tiene turno a esa hora en Cancha ${conflict.cancha}`)
        return prev
      }
      return [...prev, id]
    })
  }

  // Alumnos ordenados y filtrados
  const sortedAlumnos = [...alumnos].sort((a, b) => {
    const aSel = selectedIds.includes(a.id) ? 0 : 1
    const bSel = selectedIds.includes(b.id) ? 0 : 1
    if (aSel !== bSel) return aSel - bSel
    return a.nombre.localeCompare(b.nombre)
  })
  const filteredAlumnos = pickerSearch.trim()
    ? sortedAlumnos.filter(a => a.nombre.toLowerCase().includes(pickerSearch.toLowerCase()))
    : sortedAlumnos

  const existing  = turnos.filter(t =>
    t.dia === form.dia && t.hora === form.hora &&
    t.cancha === form.cancha && t.fijo === true && t.id !== editId
  )
  const freeSlots = 4 - existing.flatMap(t => t.alumnoIds).length

  async function handleSave() {
    if (!selectedIds.length) { onToast('Seleccioná al menos un alumno'); return }
    setSaving(true)
    try {
      const existing = editId ? turnos.find(t => t.id === editId) : undefined
      await saveTurno({
        id: editId || undefined,
        alumnoIds: selectedIds,
        dia: form.dia, hora: form.hora, cancha: form.cancha,
        tipo: form.tipo, fijo: form.fijo,
        fecha: form.fijo ? undefined : (form.fecha || undefined),
        excepciones: existing?.excepciones ?? [],
        pago: 'pagado', notas: form.notas,
      })
      onToast(editId ? 'Turno actualizado ✓' : 'Turno guardado ✓')
      onClose()
    } catch { onToast('Error al guardar') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!editId) return
    setSaving(true)
    try { await deleteTurno(editId); onToast(isEditingBloqueo ? 'Cancha desbloqueada' : 'Turno eliminado'); onClose() }
    catch { onToast('Error al eliminar') }
    finally { setSaving(false) }
  }

  async function handleBloquear() {
    setSaving(true)
    try {
      const prev = editId ? turnos.find(t => t.id === editId) : undefined
      await saveTurno({
        id: editId || undefined,
        alumnoIds: [],
        dia: form.dia, hora: form.hora, cancha: form.cancha,
        tipo: 'bloqueo', fijo: form.fijo,
        fecha: form.fijo ? undefined : (form.fecha || undefined),
        excepciones: prev?.excepciones ?? [],
        pago: 'pagado', notas: form.notas || '',
      })
      onToast('Cancha bloqueada ✓')
      onClose()
    } catch { onToast('Error al bloquear') }
    finally { setSaving(false) }
  }

  const modalTitle = isEditingBloqueo ? 'Cancha bloqueada' : editId ? 'Editar turno' : 'Nuevo turno'

  return (
    <Modal open={open} onClose={onClose} title={modalTitle}>

      {/* Cancha */}
      <Form.Group className="mb-2">
        <Form.Label className="small fw-bold">Cancha</Form.Label>
        <Form.Select value={form.cancha} onChange={e => set('cancha', Number(e.target.value))} disabled={isEditingBloqueo}>
          <option value={1}>🏟️ Cancha 1</option>
          <option value={2}>🏟️ Cancha 2</option>
        </Form.Select>
      </Form.Group>

      {/* Día + Hora */}
      <Row className="g-2 mb-2">
        <Col>
          <Form.Label className="small fw-bold">Día</Form.Label>
          <Form.Select value={form.dia} onChange={e => set('dia', Number(e.target.value))} disabled={isEditingBloqueo}>
            {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map((d, i) => (
              <option key={i} value={i + 1}>{d}</option>
            ))}
          </Form.Select>
        </Col>
        <Col>
          <Form.Label className="small fw-bold">Hora</Form.Label>
          <Form.Select value={form.hora} onChange={e => set('hora', e.target.value)} disabled={isEditingBloqueo}>
            {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
          </Form.Select>
        </Col>
      </Row>

      {/* Tipo — oculto para bloqueos */}
      {!isEditingBloqueo && (
        <Form.Group className="mb-2">
          <Form.Label className="small fw-bold">Tipo de turno</Form.Label>
          <Form.Select value={form.tipo} onChange={e => { set('tipo', e.target.value as TipoClase); setSelected([]) }}>
            <option value="grupal">Grupal</option>
            <option value="individual">Individual</option>
          </Form.Select>
        </Form.Group>
      )}

      {isGrupal && (
        <p className="text-muted small mb-2 p-2 bg-light rounded">
          {['Lun','Mar','Mié','Jue','Vie','Sáb'][form.dia-1]} {form.hora} · C{form.cancha} — <strong>{Math.max(0, freeSlots)} lugar{freeSlots !== 1 ? 'es' : ''}</strong> disponibles
        </p>
      )}

      {/* ── Picker de alumnos — oculto para bloqueos ──────── */}
      {!isEditingBloqueo && <div className="mb-2">
        <div className="d-flex align-items-center justify-content-between mb-1">
          <Form.Label className="small fw-bold mb-0">
            {isGrupal ? `Alumnos (máx ${maxSel})` : 'Alumno'}
          </Form.Label>
          {selectedIds.length > 0 && (
            <Badge bg="primary" className="fw-normal">
              {selectedIds.length}/{maxSel} seleccionado{selectedIds.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="border rounded overflow-hidden" style={{ maxHeight: 260 }}>
          {/* Search fija arriba */}
          <div className="p-2 border-bottom bg-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <Form.Control
              ref={searchRef}
              size="sm"
              placeholder="🔍 Buscar alumno..."
              value={pickerSearch}
              onChange={e => setPickerSearch(e.target.value)}
            />
          </div>

          {/* Lista scrolleable */}
          <div style={{ overflowY: 'auto', maxHeight: 200 }}>
            {alumnos.length === 0 ? (
              <p className="text-muted small p-3 mb-0 text-center">Sin alumnos cargados</p>
            ) : filteredAlumnos.length === 0 ? (
              <p className="text-muted small p-3 mb-0 text-center">Sin resultados</p>
            ) : (
              filteredAlumnos.map(a => {
                const sel      = selectedIds.includes(a.id)
                const conflict = !sel ? conflictFor(a.id) : null
                const nombre   = a.nombre
                return (
                  <div
                    key={a.id}
                    onClick={() => toggleAlumno(a.id)}
                    style={{
                      cursor: conflict ? 'not-allowed' : 'pointer',
                      borderBottom: '1px solid #f0f0f0',
                      opacity: conflict ? 0.45 : 1,
                    }}
                    className={`d-flex align-items-center gap-2 px-3 py-2 ${sel ? 'bg-light' : ''}`}
                  >
                    <Form.Check type="checkbox" readOnly checked={sel}
                      tabIndex={-1} className="flex-shrink-0 mb-0"
                      style={{ pointerEvents: 'none' }} />
                    <span className="small" style={{ fontWeight: sel ? 500 : 400 }}>{nombre}</span>
                    {conflict && (
                      <span className="text-danger ms-auto" style={{ fontSize: 10 }}>C{conflict.cancha}</span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Chips de seleccionados */}
        {selectedIds.length > 0 && (
          <div className="d-flex flex-wrap gap-1 mt-2">
            {selectedIds.map(id => {
              const a = alumnos.find(x => x.id === id)
              if (!a) return null
              return (
                <Badge
                  key={id}
                  bg="primary"
                  className="fw-normal d-flex align-items-center gap-1"
                  style={{ cursor: 'pointer', fontSize: 12 }}
                  onClick={() => toggleAlumno(id)}
                >
                  {a.nombre} ✕
                </Badge>
              )
            })}
          </div>
        )}
      </div>}

      <Form.Check
        type="switch"
        id="fijo-switch"
        className="mb-3"
        label={<span><strong>{isEditingBloqueo ? 'Bloqueo fijo' : 'Turno fijo'}</strong> <span className="text-muted" style={{ fontSize: 12 }}>— se repite cada semana</span></span>}
        checked={form.fijo}
        onChange={e => set('fijo', e.target.checked)}
        disabled={isEditingBloqueo}
      />

      <Form.Group className="mb-3">
        <Form.Label className="small fw-bold">Notas</Form.Label>
        <Form.Control value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Observaciones..." disabled={isEditingBloqueo} />
      </Form.Group>

      {/* ── Botones de acción ──────────────────────────────── */}
      {isEditingBloqueo ? (
        /* Editando un bloqueo: solo desbloquear */
        <Button variant="outline-secondary" className="w-100 fw-bold" onClick={() => setConfirm(true)} disabled={saving}>
          {saving ? 'Procesando...' : '🔓 Desbloquear cancha'}
        </Button>
      ) : (
        <>
          {/* Guardar turno normal */}
          <Button variant="primary" className="w-100 fw-bold" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : '💾 Guardar turno'}
          </Button>

          {/* Bloquear — siempre disponible */}
          <Button variant="outline-danger" className="w-100 mt-2" onClick={handleBloquear} disabled={saving}>
            🚫 Bloquear cancha
          </Button>

          {/* Eliminar — solo al editar */}
          {editId && (
            <Button variant="link" className="w-100 mt-1 text-danger small" onClick={() => setConfirm(true)} disabled={saving}>
              Eliminar turno
            </Button>
          )}
        </>
      )}
      <ConfirmModal
        open={confirm}
        title={isEditingBloqueo ? 'Desbloquear cancha' : 'Eliminar turno'}
        message={isEditingBloqueo ? '¿Confirmar desbloqueo de la cancha?' : '¿Eliminar este turno? La acción no se puede deshacer.'}
        onConfirm={() => { setConfirm(false); handleDelete() }}
        onCancel={() => setConfirm(false)}
        confirmLabel={isEditingBloqueo ? 'Desbloquear' : 'Eliminar'}
      />
    </Modal>
  )
}
