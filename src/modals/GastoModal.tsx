import { useState, useEffect } from 'react'
import Form   from 'react-bootstrap/Form'
import Row    from 'react-bootstrap/Row'
import Col    from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'
import { Modal }        from '../components/Modal'
import { useStore }     from '../lib/store'
import type { CatGasto } from '../types'

interface Props {
  open: boolean; editId: string | null
  onClose: () => void; onToast: (msg: string) => void
  defaultPeriodo?: string   // pre-fill desde el filtro activo en Gastos
}

const CATS: { value: CatGasto; icon: string; label: string; variant: string }[] = [
  { value: 'cancha', icon: '💸', label: 'Cancha',  variant: 'primary'   },
  { value: 'bar',    icon: '🍺', label: 'Bar',     variant: 'warning'   },
  { value: 'otro',   icon: '📦', label: 'Otro',    variant: 'secondary' },
]

interface FormState {
  cat:       CatGasto
  monto:     number | ''
  fecha:     string
  periodo:   string
  usuarioId: string
  desc:      string
  notas:     string
}

const currentMonth = () => new Date().toISOString().substring(0, 7)   // "YYYY-MM"

const blank = (defaultPeriodo?: string): FormState => ({
  cat: 'cancha', monto: '',
  fecha:    new Date().toISOString().split('T')[0],
  periodo:  defaultPeriodo ?? currentMonth(),   // mes actual como sugerencia
  usuarioId: '', desc: '', notas: '',
})

export function GastoModal({ open, editId, onClose, onToast, defaultPeriodo }: Props) {
  const { state: { gastos, usuarios }, saveGasto, deleteGasto } = useStore()
  const [form,   setForm]   = useState<FormState>(blank(defaultPeriodo))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editId) {
      const g = gastos.find(x => x.id === editId)
      if (g) {
        setForm({
          cat:       (g.cat as CatGasto) ?? 'cancha',
          monto:     g.monto,
          fecha:     g.fecha,
          periodo:   g.periodo ?? '',
          usuarioId: g.usuarioId ?? '',
          desc:      g.desc,
          notas:     g.notas,
        })
        return
      }
    }
    setForm(blank(defaultPeriodo))
  }, [open, editId, gastos])

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave() {
    const monto = Number(form.monto)
    if (!monto || monto <= 0) { onToast('Ingresá un monto'); return }
    setSaving(true)
    try {
      await saveGasto({
        id:        editId || undefined,
        cat:       form.cat,
        monto,
        desc:      form.desc.trim() || CATS.find(c => c.value === form.cat)?.label || form.cat,
        fecha:     form.fecha,
        periodo:   form.periodo || undefined,
        usuarioId: form.usuarioId,
        notas:     form.notas.trim(),
      })
      onToast(editId ? 'Gasto actualizado ✓' : 'Gasto guardado ✓')
      onClose()
    } catch { onToast('Error al guardar') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!editId) return
    setSaving(true)
    try { await deleteGasto(editId); onToast('Gasto eliminado'); onClose() }
    catch { onToast('Error al eliminar') }
    finally { setSaving(false) }
  }

  // Solo profes en el selector — los dev no se asignan a sí mismos en gastos
  const sortedUsuarios = [...usuarios]
    .filter(u => (u.rol ?? 'profe') !== 'dev')
    .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email))

  return (
    <Modal open={open} onClose={onClose} title={editId ? 'Editar gasto' : 'Nuevo gasto'}>

      {/* Categoría */}
      <Form.Label className="small fw-bold">Categoría</Form.Label>
      <div className="d-flex gap-2 mb-3">
        {CATS.map(c => (
          <Button key={c.value}
            variant={form.cat === c.value ? c.variant : `outline-${c.variant}`}
            className="flex-grow-1 fw-semibold"
            onClick={() => set('cat', c.value)}>
            {c.icon} {c.label}
          </Button>
        ))}
      </div>

      {/* Período + Monto */}
      <Row className="g-2 mb-2">
        <Col>
          <Form.Label className="small fw-bold">Período</Form.Label>
          <div className="d-flex gap-1">
            <Form.Control type="month" lang="es-AR" value={form.periodo} onChange={e => set('periodo', e.target.value)} />
            {form.periodo && <Button variant="outline-secondary" size="sm" onClick={() => set('periodo', '')}>✕</Button>}
          </div>
        </Col>
        <Col>
          <Form.Label className="small fw-bold">Monto ($)</Form.Label>
          <Form.Control type="number" inputMode="numeric" placeholder="0"
            value={form.monto}
            onChange={e => set('monto', e.target.value === '' ? '' : Number(e.target.value))} />
        </Col>
      </Row>

      {/* Fecha + Usuario */}
      <Row className="g-2 mb-2">
        <Col>
          <Form.Label className="small fw-bold">Fecha</Form.Label>
          <Form.Control type="date" lang="es-AR" value={form.fecha}
            onChange={e => set('fecha', e.target.value)} />
        </Col>
        <Col>
          <Form.Label className="small fw-bold">Usuario</Form.Label>
          <Form.Select value={form.usuarioId} onChange={e => set('usuarioId', e.target.value)}>
            <option value="">— Sin asignar —</option>
            {sortedUsuarios.map(u => (
              <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      {/* Descripción */}
      <Form.Group className="mb-2">
        <Form.Label className="small fw-bold">Descripción</Form.Label>
        <Form.Control value={form.desc} onChange={e => set('desc', e.target.value)}
          placeholder="Ej: Alquiler cancha martes..." />
      </Form.Group>

      {/* Notas */}
      <Form.Group className="mb-3">
        <Form.Label className="small fw-bold">Notas</Form.Label>
        <Form.Control value={form.notas} onChange={e => set('notas', e.target.value)}
          placeholder="Observaciones..." />
      </Form.Group>

      <Button variant="primary" className="w-100 fw-bold" onClick={handleSave} disabled={saving}>
        {saving ? 'Guardando...' : '💾 Guardar gasto'}
      </Button>
      {editId && (
        <Button variant="link" className="w-100 mt-1 text-danger small" onClick={handleDelete} disabled={saving}>
          Eliminar gasto
        </Button>
      )}
    </Modal>
  )
}
