import { useState, useEffect, type ReactNode } from 'react'
import Form    from 'react-bootstrap/Form'
import Button  from 'react-bootstrap/Button'
import Badge   from 'react-bootstrap/Badge'
import Table   from 'react-bootstrap/Table'
import BSModal from 'react-bootstrap/Modal'
import Row     from 'react-bootstrap/Row'
import Col     from 'react-bootstrap/Col'
import InputGroup from 'react-bootstrap/InputGroup'
import { useStore }                                          from '../lib/store'
import { usePrecios, CLASES_POR_TIPO, type PreciosConfig }   from '../lib/config'
import { usePagos, getPagoEstado, type PagoRecord } from '../lib/pagos'
import { ff, fp, periodoLabel }                              from '../lib/utils'
import { DateFieldES }    from '../components/DateFieldES'
import { ConfirmModal }  from '../components/ConfirmModal'

interface Props { onToast: (msg: string) => void; newTrigger?: number; onNewHandled?: () => void; onPagoPaid?: (id: string) => void }


type Est = ReturnType<typeof getPagoEstado> | 'sindatos'

function EstadoBadge({ e }: { e: Est }) {
  if (e === 'pagado')   return <Badge bg="success">Pagado</Badge>
  if (e === 'vencido')  return <Badge bg="danger">Vencido</Badge>
  if (e === 'sindatos') return <Badge bg="light" text="dark" className="border">Sin datos</Badge>
  return <Badge bg="primary">Pendiente</Badge>
}

// ════════════════════════════════════════════════════════════════
// Modal — todos los campos editables
// ════════════════════════════════════════════════════════════════
interface CobroFormData {
  alumnoId:    string
  monto:       string
  proximoPago: string
  fechaPago:   string
  usuarioId:   string
  periodo:     string
}

function CobroModal({ open, onClose, onSave, onDelete, alumnoId, initialData, alumnos, usuarios, title }: {
  open: boolean; onClose: () => void
  onSave:    (d: CobroFormData) => Promise<void>
  onDelete?: () => void
  alumnoId?: string
  initialData?: Partial<CobroFormData>
  alumnos: { id: string; nombre: string }[]
  usuarios: { uid: string; displayName: string; email: string; rol?: string }[]
  title: string
}) {
  const [form,   setForm]   = useState<CobroFormData>({
    alumnoId: alumnoId ?? '', monto: '', proximoPago: '', fechaPago: '', usuarioId: '', periodo: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        alumnoId:    alumnoId ?? initialData?.alumnoId ?? '',
        monto:       initialData?.monto       ?? '',
        proximoPago: initialData?.proximoPago ?? '',
        fechaPago:   initialData?.fechaPago   ?? '',
        usuarioId:   initialData?.usuarioId   ?? '',
        periodo:     initialData?.periodo     ?? '',
      })
    }
  }, [open])

  function set(k: keyof CobroFormData, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.alumnoId || !form.proximoPago) return
    setSaving(true)
    try { await onSave(form); onClose() } finally { setSaving(false) }
  }

  const sortedAlumnos = [...alumnos].sort((a, b) => a.nombre.localeCompare(b.nombre))
  // Solo profes en el selector de cobros — los dev no se asignan a sí mismos
  const sortedUsers   = [...usuarios]
    .filter(u => (u.rol ?? 'profe') === 'profe')
    .sort((a, b) => (a.displayName||a.email).localeCompare(b.displayName||b.email))

  return (
    <BSModal show={open} onHide={onClose} centered>
      <BSModal.Header closeButton>
        <BSModal.Title className="fs-6 fw-bold">{title}</BSModal.Title>
      </BSModal.Header>
      <BSModal.Body>
        {/* Alumno */}
        <Form.Group className="mb-2">
          <Form.Label className="small fw-bold">Alumno *</Form.Label>
          {alumnoId ? (
            <Form.Control readOnly disabled
              value={(() => { const a = alumnos.find(x => x.id === alumnoId); return a ? a.nombre : alumnoId })()} />
          ) : (
            <Form.Select value={form.alumnoId} onChange={e => set('alumnoId', e.target.value)}>
              <option value="">— Seleccionar alumno —</option>
              {sortedAlumnos.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </Form.Select>
          )}
        </Form.Group>

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
              value={form.monto} onChange={e => set('monto', e.target.value)} />
          </Col>
        </Row>

        {/* Vencimiento + Fecha de cobro */}
        <Row className="g-2 mb-2">
          <Col>
            <Form.Label className="small fw-bold">Fecha de vencimiento *</Form.Label>
            <DateFieldES value={form.proximoPago} onChange={v => set('proximoPago', v)} />
          </Col>
          <Col>
            <Form.Label className="small fw-bold">Fecha de cobro</Form.Label>
            <DateFieldES value={form.fechaPago} onChange={v => set('fechaPago', v)} />
            <Form.Text className="text-muted">Completar al cobrar</Form.Text>
          </Col>
        </Row>

        {/* Usuario */}
        <Form.Group className="mb-3">
          <Form.Label className="small fw-bold">Usuario que cobró</Form.Label>
          <Form.Select value={form.usuarioId} onChange={e => set('usuarioId', e.target.value)}>
            <option value="">— Seleccionar —</option>
            {sortedUsers.map(u => (
              <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
            ))}
          </Form.Select>
        </Form.Group>

        <Button variant="primary" className="w-100 fw-bold"
          onClick={handleSave} disabled={saving || !form.alumnoId || !form.proximoPago}>
          {saving ? 'Guardando...' : '💾 Guardar'}
        </Button>
        {onDelete && (
          <Button variant="link" className="w-100 mt-1 text-danger small" onClick={onDelete}>
            Eliminar cobro
          </Button>
        )}
      </BSModal.Body>
    </BSModal>
  )
}

// ════════════════════════════════════════════════════════════════
// Tab Cobros — lista de pagos, alta por formulario
// ════════════════════════════════════════════════════════════════
interface CobrosTabProps extends Props { newTrigger?: number; onNewHandled?: () => void; onPagoPaid?: (id: string) => void; tabControls?: ReactNode }

function CobrosTab({ onToast, newTrigger, onNewHandled, onPagoPaid, tabControls }: CobrosTabProps) {
  const { state: { alumnos, usuarios } }                         = useStore()
  const { pagos, loading, createPago, updatePago, deletePago }   = usePagos()

  const currentMonth = new Date().toISOString().substring(0, 7)
  const [query,   setQuery]   = useState('')
  const [periodo, setPeriodo] = useState(currentMonth)
  const [estado,  setEstado]  = useState<'all'|'pendiente'|'vencido'|'pagado'>('all')
  // modal: null=closed, 'new'=alta, PagoRecord=editar
  const [modal,      setModal]      = useState<null | 'new' | PagoRecord>(null)
  const [confirmId,  setConfirmId]  = useState<string | null>(null)

  // FAB / header "+ Nuevo" → abre modal de alta (y resetea el trigger)
  useEffect(() => {
    if (newTrigger) {
      setModal('new')
      onNewHandled?.()
    }
  }, [newTrigger])

  if (loading) return <div className="text-center py-4 text-muted">Cargando...</div>

  function alumnoName(id: string) {
    const a = alumnos.find(x => x.id === id)
    return a ? a.nombre : '—'
  }
  function usuarioName(id?: string) {
    if (!id) return '—'
    const u = usuarios.find(x => x.uid === id)
    return u?.displayName || u?.email || '—'
  }

  async function handleSave(data: CobroFormData) {
    const monto = Number(data.monto) || 0
    const per   = data.periodo || undefined

    const isEdit   = modal !== null && typeof modal === 'object'

    try {
      if (isEdit && modal !== null && typeof modal === 'object') {
        await updatePago(modal.id, {
          monto, proximoPago: data.proximoPago, periodo: per,
          fechaPago: data.fechaPago || undefined,
          usuarioId: data.usuarioId || undefined,
        })
        if (data.fechaPago) onPagoPaid?.(modal.id)
        onToast('Cobro actualizado ✓')
      } else {
        await createPago({
          alumnoId:    data.alumnoId,
          monto,
          proximoPago: data.proximoPago,
          fechaPago:   data.fechaPago || undefined,
          usuarioId:   data.usuarioId || undefined,
          periodo:     per,
        })
        onToast('Cobro agregado ✓')
      }
      setModal(null)
    } catch { onToast('Error al guardar') }
  }

  async function handleDelete(id: string) {
    try { await deletePago(id); onToast('Cobro eliminado') }
    catch { onToast('Error') }
  }

  // Filtrar pagos por período y estado
  const rows = [...pagos]
    .filter(p => !periodo || p.periodo === periodo)
    .filter(p => {
      if (estado === 'all') return true
      return getPagoEstado(p) === estado
    })
    .filter(p => !query || alumnoName(p.alumnoId).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => alumnoName(a.alumnoId).localeCompare(alumnoName(b.alumnoId)))

  const counts = {
    pagado:    pagos.filter(p => (!periodo || p.periodo === periodo) && getPagoEstado(p) === 'pagado').length,
    pendiente: pagos.filter(p => (!periodo || p.periodo === periodo) && getPagoEstado(p) === 'pendiente').length,
    vencido:   pagos.filter(p => (!periodo || p.periodo === periodo) && getPagoEstado(p) === 'vencido').length,
  }

  const editData = modal !== 'new' && modal !== null ? modal : null

  return (
    <>
      {/* Tabs + Filtros */}
      <div className="d-flex align-items-center gap-2 mb-2">{tabControls}</div>
      <div className="filter-bar mb-3">
        <InputGroup size="sm" style={{ maxWidth: 210 }}>
          <InputGroup.Text>🔍</InputGroup.Text>
          <Form.Control placeholder="Buscar alumno..." value={query} onChange={e => setQuery(e.target.value)} />
          {query && <Button variant="outline-secondary" onClick={() => setQuery('')}>✕</Button>}
        </InputGroup>

        <div className="d-flex align-items-center gap-1">
          <Form.Control type="month" lang="es-AR" size="sm" style={{ maxWidth: 148, flex: '1 1 auto' }}
            value={periodo} onChange={e => setPeriodo(e.target.value)} />
          {periodo && <Button variant="outline-secondary" size="sm" onClick={() => setPeriodo('')}>✕</Button>}
        </div>

        <Form.Select size="sm" style={{ maxWidth: 180 }} value={estado} onChange={e => setEstado(e.target.value as typeof estado)}>
          <option value="all">Todos</option>
          <option value="pendiente">Pendientes ({counts.pendiente})</option>
          <option value="vencido">Vencidos ({counts.vencido})</option>
          <option value="pagado">Pagados ({counts.pagado})</option>
        </Form.Select>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <div style={{ fontSize: 40 }} className="mb-2">💰</div>
          <div className="fw-bold">Sin cobros{periodo ? ` en ${periodoLabel(periodo)}` : ''}</div>
          <Button variant="primary" className="mt-3" onClick={() => setModal('new')}>+ Agregar cobro</Button>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="d-md-none d-flex flex-column gap-2">
            {rows.map(p => {
              const est = getPagoEstado(p)
              const bg  = est === 'vencido' ? '#fff5f5' : est === 'pagado' ? '#f0fff4' : 'white'
              return (
                <div key={p.id} className="rounded shadow-sm p-3" style={{ background: bg, cursor: 'pointer' }}
                  onClick={() => setModal(p)}>
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <span className="fw-bold text-uppercase" style={{ fontSize: 13 }}>{alumnoName(p.alumnoId)}</span>
                    <EstadoBadge e={est} />
                  </div>
                  <div className="d-flex gap-2 flex-wrap" style={{ fontSize: 12 }}>
                    {p.periodo && <Badge bg="info" text="dark" className="fw-normal">{periodoLabel(p.periodo)}</Badge>}
                    <span className="fw-bold text-primary">{fp(p.monto)}</span>
                    <span className="text-muted">Vto: <span className={est === 'vencido' ? 'text-danger fw-semibold' : ''}>{ff(p.proximoPago)}</span></span>
                    {p.fechaPago && <span className="text-muted">Cobrado: {ff(p.fechaPago)}</span>}
                    {p.usuarioId && <span className="text-muted">{usuarioName(p.usuarioId)}</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop: tabla */}
          <div className="d-none d-md-block table-responsive rounded shadow-sm">
            <Table hover className="mb-0 align-middle bg-white" style={{ fontSize: 13 }}>
              <thead className="table-light">
                <tr>
                  <th>Alumno</th>
                  <th>Período</th>
                  <th className="text-end">Monto</th>
                  <th>Vencimiento</th>
                  <th>Fecha cobro</th>
                  <th>Cobró</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(p => {
                  const est = getPagoEstado(p)
                  return (
                    <tr key={p.id} className={est === 'vencido' ? 'table-danger' : est === 'pagado' ? 'table-success' : ''}>
                      <td className="fw-semibold text-uppercase">{alumnoName(p.alumnoId)}</td>
                      <td>{p.periodo ? <Badge bg="info" text="dark" className="fw-normal">{periodoLabel(p.periodo)}</Badge> : '—'}</td>
                      <td className="text-end fw-bold text-primary">{fp(p.monto)}</td>
                      <td className={est === 'vencido' ? 'text-danger fw-semibold' : 'text-muted'}>{ff(p.proximoPago)}</td>
                      <td className="text-muted">{p.fechaPago ? ff(p.fechaPago) : '—'}</td>
                      <td className="text-muted" style={{ fontSize: 11 }}>{usuarioName(p.usuarioId)}</td>
                      <td><EstadoBadge e={est} /></td>
                      <td><Button variant="outline-primary" size="sm" onClick={() => setModal(p)}>✏️</Button></td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </div>
        </>
      )}

      {/* Modal alta / edición */}
      {modal !== null && (
        <CobroModal
          open
          onClose={() => setModal(null)}
          onSave={handleSave}
          title={editData ? `Editar cobro — ${alumnoName(editData.alumnoId)}` : 'Agregar cobro'}
          alumnoId={editData?.alumnoId}
          initialData={editData ? {
            monto:       String(editData.monto || ''),
            proximoPago: editData.proximoPago,
            usuarioId:   editData.usuarioId ?? '',
            fechaPago:   editData.fechaPago  ?? '',
            periodo:     editData.periodo    ?? '',
          } : { periodo }}
          onDelete={editData ? () => setConfirmId(editData.id) : undefined}
          alumnos={alumnos}
          usuarios={usuarios}
        />
      )}
      <ConfirmModal
        open={!!confirmId}
        title="Eliminar cobro"
        message="¿Eliminar este cobro? La acción no se puede deshacer."
        onConfirm={() => { const id = confirmId!; setConfirmId(null); setModal(null); handleDelete(id) }}
        onCancel={() => setConfirmId(null)}
      />
    </>
  )
}

// ════════════════════════════════════════════════════════════════
// Tab Configuración
// ════════════════════════════════════════════════════════════════
interface PrecioRow { key: keyof PreciosConfig; label: string; desc: string; badge?: string }
const ROWS: PrecioRow[] = [
  { key: 'grupalMensual',     label: 'Grupal mensual',        desc: 'Se calcula por 4 clases',  badge: '× 4' },
  { key: 'grupalDoble',       label: 'Grupal doble',          desc: 'Se calcula por 8 clases',  badge: '× 8' },
  { key: 'grupalTriple',      label: 'Grupal triple',         desc: 'Se calcula por 12 clases', badge: '× 12' },
  { key: 'individualMensual', label: 'Individual mensual',    desc: 'Se calcula por 4 clases',  badge: '× 4' },
  { key: 'grupalPorClase',    label: 'Grupal por clase',      desc: 'Clase suelta grupal' },
  { key: 'individual',        label: 'Individual por clase',  desc: 'Clase suelta individual' },
]

function ConfiguracionTab({ onToast }: Props) {
  const { precios, loading, savePrecios } = usePrecios()
  const [form, setForm]     = useState<PreciosConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const values = form ?? precios
  function set(k: keyof PreciosConfig, v: number) { setForm(p => ({ ...(p ?? precios), [k]: v })) }
  async function handleSave() {
    setSaving(true)
    try { await savePrecios(values); onToast('Precios guardados ✓'); setForm(null) }
    catch { onToast('Error') } finally { setSaving(false) }
  }
  if (loading) return <div className="text-center py-4 text-muted">Cargando...</div>
  return (
    <>
      <h6 className="fw-bold mb-3">Tabla de valores de referencia</h6>
      <div className="rounded shadow-sm overflow-hidden mb-3" style={{ background: 'white' }}>
        {ROWS.map((row, i) => {
          const val = values[row.key]; const c = CLASES_POR_TIPO[row.key]
          const xC  = c && val > 0 ? Math.round(val / c) : null
          return (
            <div key={row.key} className={`d-flex align-items-center gap-3 px-3 py-2${i < ROWS.length-1 ? ' border-bottom' : ''}`}>
              <div className="flex-grow-1">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-semibold" style={{ fontSize: 13 }}>{row.label}</span>
                  {row.badge && <Badge bg="light" text="dark" className="fw-normal border" style={{ fontSize: 10 }}>{row.badge}</Badge>}
                </div>
                <div style={{ fontSize: 11, color: '#6c757d' }}>{row.desc}{xC ? ` — $${Math.round(xC).toLocaleString('es-AR')}/clase` : ''}</div>
              </div>
              <div style={{ width: 110 }}>
                <Form.Control type="number" size="sm" inputMode="numeric"
                  value={val || ''} onChange={e => set(row.key, Number(e.target.value) || 0)}
                  className="text-end fw-semibold" style={{ fontSize: 13 }} />
              </div>
            </div>
          )
        })}
      </div>
      <Button variant="primary" className="w-100 fw-bold" onClick={handleSave} disabled={saving || !form}>
        {saving ? 'Guardando...' : '💾 Guardar precios'}
      </Button>
      {!form && <p className="text-center text-muted small mt-2">Sin cambios pendientes</p>}
    </>
  )
}

// ════════════════════════════════════════════════════════════════
type CobrosTabId = 'cobros' | 'config'

export function Cobros({ onToast, newTrigger, onNewHandled, onPagoPaid }: Props) {
  const [tab, setTab] = useState<CobrosTabId>('cobros')

  const tabBtns = (
    <div className="btn-group btn-group-sm">
      <button type="button" title="Cobros"
        className={`btn ${tab === 'cobros' ? 'btn-primary' : 'btn-outline-secondary'}`}
        onClick={() => setTab('cobros')}>
        💰<span className="d-none d-md-inline ms-1">Cobros</span>
      </button>
      <button type="button" title="Configuración"
        className={`btn ${tab === 'config' ? 'btn-primary' : 'btn-outline-secondary'}`}
        onClick={() => setTab('config')}>
        ⚙️<span className="d-none d-md-inline ms-1">Config</span>
      </button>
    </div>
  )

  return (
    <>
      {tab === 'cobros' && (
        <CobrosTab tabControls={tabBtns} onToast={onToast}
          newTrigger={newTrigger} onNewHandled={onNewHandled} onPagoPaid={onPagoPaid} />
      )}
      {tab === 'config' && (
        <>
          <div className="d-flex gap-2 mb-3 align-items-center">{tabBtns}</div>
          <ConfiguracionTab onToast={onToast} />
        </>
      )}
    </>
  )
}
