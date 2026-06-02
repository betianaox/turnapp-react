import { useState } from 'react'
import Button  from 'react-bootstrap/Button'
import Badge   from 'react-bootstrap/Badge'
import Form    from 'react-bootstrap/Form'
import Row     from 'react-bootstrap/Row'
import Col     from 'react-bootstrap/Col'
import { useStore }                from '../lib/store'
import { usePagos, getPagoEstado } from '../lib/pagos'
import { ff, fp }                  from '../lib/utils'
import { AVISOS_TITLE }            from '../constants'

interface Props {
  onOpenAlumno:    (id: string) => void
  onToast:         (msg: string) => void
  vistos:          Set<string>
  onToggleVisto:   (id: string) => void
  onLimpiarVistos: () => void
}

const DEFAULT_WA = '543416848972'
const TODAY    = new Date().toISOString().split('T')[0]
const TOMORROW = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })()

function waUrl(tel: string, msg: string) {
  const num   = tel ? tel.replace(/\D/g, '') : DEFAULT_WA
  const phone = num.startsWith('54') ? num : `54${num}`
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}

function buildMsg(nombre: string, monto: number, proximoPago: string, estado: string) {
  const cuando = estado === 'vencido' ? 'está vencida' : 'vence mañana'
  return `Hola ${nombre}! 👋 Tu cuota ${cuando} (${ff(proximoPago)}). El monto es ${fp(monto)}. Por favor coordiná el pago. ¡Gracias!`
}

function WhatsAppIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
      width="15" height="15" style={{ display: 'block', flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

const CUR_PERIODO = new Date().toISOString().substring(0, 7)

export function Avisos({ onOpenAlumno, onToast, vistos, onToggleVisto }: Props) {
  const { state: { alumnos } } = useStore()
  const { pagos, loading }     = usePagos()

  const [editedMsgs, setEditedMsgs] = useState<Record<string, string>>({})
  const [periodo,    setPeriodo]    = useState(CUR_PERIODO)

  if (loading) return <div className="text-center py-4 text-muted">Cargando...</div>

  const avisos = pagos
    .filter(p => !p.fechaPago && (p.proximoPago < TODAY || p.proximoPago === TOMORROW))
    .filter(p => !periodo || p.periodo === periodo)
    .map(p => {
      const alumno = alumnos.find(a => a.id === p.alumnoId)
      if (!alumno) return null
      return { p, alumno, estado: getPagoEstado(p) }
    })
    .filter(Boolean)
    .sort((a, b) => a!.p.proximoPago.localeCompare(b!.p.proximoPago)) as NonNullable<{
      p: typeof pagos[0]; alumno: typeof alumnos[0]; estado: ReturnType<typeof getPagoEstado>
    }>[]

  function getMsg(id: string, nombre: string, monto: number, proximoPago: string, estado: string) {
    return editedMsgs[id] ?? buildMsg(nombre, monto, proximoPago, estado)
  }

  function copiarTodos() {
    const lines = avisos.map(({ p, alumno, estado }) => getMsg(p.id, alumno.nombre, p.monto, p.proximoPago, estado))
    navigator.clipboard.writeText(lines.join('\n\n')).then(() => onToast('¡Copiado!')).catch(() => {})
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h6 className="fw-bold mb-0">{AVISOS_TITLE}</h6>
        {avisos.length > 0 && (
          <Button variant="outline-primary" size="sm" onClick={copiarTodos}>📋 Copiar todos</Button>
        )}
      </div>

      <div className="filter-bar mb-3">
        <div className="filter-auto d-flex align-items-center gap-1">
          <Form.Control type="month" size="sm" value={periodo}
            onChange={e => setPeriodo(e.target.value)} />
          {periodo && (
            <Button variant="outline-secondary" size="sm" onClick={() => setPeriodo('')}>✕</Button>
          )}
        </div>
      </div>

      <hr className="section-sep" />

      {avisos.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <div style={{ fontSize: 48 }} className="mb-2">🎉</div>
          <div className="fw-bold">Todo al día</div>
          <div className="small mt-1">No hay pagos vencidos ni por vencer mañana</div>
        </div>
      ) : (
        <Row className="g-3">
        {avisos.map(({ p, alumno, estado }) => {
          const defaultMsg = buildMsg(alumno.nombre, p.monto, p.proximoPago, estado)
          const msg        = editedMsgs[p.id] ?? defaultMsg
          const url        = waUrl(alumno.tel ?? '', msg)
          const isVencido  = estado === 'vencido'
          const visto      = vistos.has(p.id)

          return (
            <Col key={p.id} xs={12} md={6} lg={4}>
            <div
              style={{
                borderLeft: `3px solid ${isVencido ? '#dc3545' : '#ffc107'}`,
                background: visto
                  ? '#f8f9fa'
                  : isVencido ? '#fff5f5' : '#fffdf0',
                borderRadius: 6,
                padding: '8px 10px',
                height: '100%',
                opacity: visto ? 0.55 : 1,
                transition: 'opacity .2s',
              }}
            >
              {/* Cabecera */}
              <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
                <span
                  className="fw-bold text-uppercase"
                  style={{ fontSize: 12, cursor: 'pointer', letterSpacing: .3 }}
                  onClick={() => onOpenAlumno(alumno.id)}
                >
                  {isVencido ? '⚠️' : '⏰'} {alumno.nombre}
                </span>
                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                  <Badge bg={isVencido ? 'danger' : 'warning'} text={isVencido ? undefined : 'dark'}
                    style={{ fontSize: 9 }}>
                    {isVencido ? 'Vencido' : 'Mañana'}
                  </Badge>
                  <button
                    onClick={() => onToggleVisto(p.id)}
                    title={visto ? 'Marcar como no visto' : 'Marcar como visto'}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1, opacity: visto ? .5 : 1 }}
                  >
                    {visto ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Monto y fecha */}
              <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 6 }}>
                {fp(p.monto)} · vto. <strong>{ff(p.proximoPago)}</strong>
              </div>

              {/* Mensaje editable */}
              <Form.Control
                as="textarea"
                rows={3}
                value={msg}
                onChange={e => setEditedMsgs(prev => ({ ...prev, [p.id]: e.target.value }))}
                style={{
                  fontSize: 11,
                  background: 'rgba(255,255,255,.75)',
                  border: '1px solid rgba(0,0,0,.08)',
                  resize: 'vertical',
                  marginBottom: editedMsgs[p.id] && editedMsgs[p.id] !== defaultMsg ? 2 : 6,
                }}
              />
              {editedMsgs[p.id] && editedMsgs[p.id] !== defaultMsg && (
                <button
                  onClick={() => setEditedMsgs(prev => { const n = { ...prev }; delete n[p.id]; return n })}
                  style={{ background: 'none', border: 'none', fontSize: 10, color: '#6c757d', cursor: 'pointer', padding: '0 0 6px 0', display: 'block' }}
                >
                  ↺ Restaurar
                </button>
              )}

              {/* Acciones */}
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  style={{ fontSize: 11, padding: '3px 9px' }}
                  onClick={() => navigator.clipboard.writeText(msg).then(() => onToast('¡Copiado!'))}
                >
                  📋 Copiar
                </Button>
                <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <Button
                    variant="success"
                    size="sm"
                    style={{ fontSize: 11, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <WhatsAppIcon /> Enviar
                  </Button>
                </a>
              </div>
            </div>
            </Col>
          )
        })}
        </Row>
      )}
    </>
  )
}
