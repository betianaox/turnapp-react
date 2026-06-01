import { useState } from 'react'
import Alert    from 'react-bootstrap/Alert'
import Button   from 'react-bootstrap/Button'
import Badge    from 'react-bootstrap/Badge'
import Form     from 'react-bootstrap/Form'
import { useStore }                from '../lib/store'
import { usePagos, getPagoEstado } from '../lib/pagos'
import { ff, fp }                  from '../lib/utils'

interface Props {
  onOpenAlumno:     (id: string) => void
  onToast:          (msg: string) => void
  vistos:           Set<string>
  onToggleVisto:    (id: string) => void
  onLimpiarVistos:  () => void
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

export function Avisos({ onOpenAlumno, onToast, vistos, onToggleVisto }: Props) {
  const { state: { alumnos } } = useStore()
  const { pagos, loading }     = usePagos()

  const [editedMsgs, setEditedMsgs] = useState<Record<string, string>>({})

  if (loading) return <div className="text-center py-4 text-muted">Cargando...</div>

  const todosLosAvisos = pagos
    .filter(p => !p.fechaPago && (p.proximoPago < TODAY || p.proximoPago === TOMORROW))

  // Los no vistos se cuentan para el badge
  const avisos = todosLosAvisos
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
        <h6 className="fw-bold mb-0">Avisos de pago</h6>
        {avisos.length > 0 && (
          <Button variant="outline-primary" size="sm" onClick={copiarTodos}>📋 Copiar todos</Button>
        )}
      </div>

      {avisos.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <div style={{ fontSize: 48 }} className="mb-2">🎉</div>
          <div className="fw-bold">Todo al día</div>
          <div className="small mt-1">No hay pagos vencidos ni por vencer mañana</div>
        </div>
      ) : (
        avisos.map(({ p, alumno, estado }) => {
          const defaultMsg = buildMsg(alumno.nombre, p.monto, p.proximoPago, estado)
          const msg        = editedMsgs[p.id] ?? defaultMsg
          const url        = waUrl(alumno.tel ?? '', msg)
          const variant    = estado === 'vencido' ? 'danger' : 'warning'

          const visto = vistos.has(p.id)
          return (
            <Alert key={p.id} variant={variant} className="mb-3" style={{ opacity: visto ? .5 : 1 }}>
              <div className="d-flex align-items-start justify-content-between gap-2 mb-1">
                <Alert.Heading className="fs-6 mb-0" style={{ cursor: 'pointer' }} onClick={() => onOpenAlumno(alumno.id)}>
                  {estado === 'vencido' ? '⚠️' : '⏰'} <span className="text-uppercase">{alumno.nombre}</span>
                </Alert.Heading>
                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                  <Badge bg={variant}>{estado === 'vencido' ? 'Vencido' : 'Vence mañana'}</Badge>
                  {/* Ojo: visto / no visto */}
                  <button onClick={() => onToggleVisto(p.id)}
                    title={visto ? 'Marcar como no visto' : 'Marcar como visto'}
                    style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, padding:0, lineHeight:1, opacity: visto ? .6 : 1 }}>
                    {visto ? '🙈' : '👁️'}
                  </button>
                  {/* Descartar — marca como visto */}
                  <button
                    onClick={() => { if (!visto) onToggleVisto(p.id) }}
                    title="Descartar aviso"
                    style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, padding:0, lineHeight:1, color:'#dc3545', opacity: visto ? .3 : 1 }}>
                    🗑️
                  </button>
                </div>
              </div>

              <small className="d-block mb-2 opacity-75">
                {fp(p.monto)} · vto. <strong>{ff(p.proximoPago)}</strong>
              </small>

              {/* Mensaje editable */}
              <Form.Control
                as="textarea"
                rows={3}
                value={msg}
                onChange={e => setEditedMsgs(prev => ({ ...prev, [p.id]: e.target.value }))}
                className="mb-2"
                style={{ fontSize: 12, background: 'rgba(255,255,255,.65)', border: 'none', resize: 'vertical' }}
              />
              {editedMsgs[p.id] && editedMsgs[p.id] !== defaultMsg && (
                <button
                  onClick={() => setEditedMsgs(prev => { const n = { ...prev }; delete n[p.id]; return n })}
                  style={{ background: 'none', border: 'none', fontSize: 11, color: '#6c757d', cursor: 'pointer', padding: '0 0 6px 0' }}
                >
                  ↺ Restaurar mensaje original
                </button>
              )}

              <div className="d-flex gap-2">
                <Button variant="light" size="sm"
                  onClick={() => navigator.clipboard.writeText(msg).then(() => onToast('¡Copiado!'))}>
                  📋 Copiar
                </Button>
                <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <Button variant="success" size="sm">💬 WhatsApp</Button>
                </a>
              </div>
            </Alert>
          )
        })
      )}
    </>
  )
}
