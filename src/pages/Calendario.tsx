import { useState, useEffect, useRef, Fragment } from 'react'
import BSModal from 'react-bootstrap/Modal'
import Button  from 'react-bootstrap/Button'
import { useStore }                  from '../lib/store'
import { usePagos, getPagoEstado }   from '../lib/pagos'
import { getWeekDates, isToday, getTurnoColor } from '../lib/utils'
import { HOURS, DAYS, MONTHS } from '../constants'
import type { Turno } from '../types'

interface Props {
  onOpenTurno: (id: string | null, dia?: number, hora?: string, cancha?: number, fecha?: string) => void
  onToast: (msg: string) => void
}

interface DelTarget { turnoId: string; fijo: boolean; fecha: string }


export function Calendario({ onOpenTurno, onToast }: Props) {
  const { state: { alumnos, turnos }, deleteTurno, addExcepcion } = useStore()
  const { pagos } = usePagos()

  // Alumnos con cobro vencido (sin fechaPago y proximoPago < hoy)
  const vencidosSet = new Set(
    pagos
      .filter(p => getPagoEstado(p) === 'vencido')
      .map(p => p.alumnoId)
  )
  const [delTarget, setDelTarget] = useState<DelTarget | null>(null)

  const jsDay       = useRef(new Date().getDay()).current
  const initWeekOff = jsDay === 0 ? 1 : 0
  const scrollDi    = jsDay === 0 ? 0 : jsDay - 1

  const [weekOff,    setWeekOff]    = useState(initWeekOff)
  const [scrollTick, setScrollTick] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (weekOff !== initWeekOff) return
    const t = setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    return () => clearTimeout(t)
  }, [weekOff, scrollTick])

  function goToday() {
    weekOff === initWeekOff ? setScrollTick(t => t + 1) : setWeekOff(initWeekOff)
  }

  const dates     = getWeekDates(weekOff)
  const weekLabel = `${dates[0].getDate()} ${MONTHS[dates[0].getMonth()]} – ${dates[5].getDate()} ${MONTHS[dates[5].getMonth()]}`
  const ds = (d: Date) => d.toISOString().split('T')[0]

  function getSlot(dia: number, hora: string, cancha: number, date: Date): Turno | undefined {
    const dateStr = ds(date)
    return turnos.find(t =>
      t.dia === dia && t.hora === hora && t.cancha === cancha &&
      (t.fijo
        ? !(t.excepciones ?? []).includes(dateStr)  // fijo: ocultar si en excepciones
        : t.fecha === dateStr                        // único: solo su fecha exacta
      )
    )
  }


  function handleDelClick(e: React.MouseEvent, t: Turno, date: Date) {
    e.stopPropagation()
    setDelTarget({ turnoId: t.id, fijo: t.fijo, fecha: ds(date) })
  }

  async function deleteSolo() {
    if (!delTarget) return
    try { await addExcepcion(delTarget.turnoId, delTarget.fecha); onToast('Eliminado para esta semana') }
    catch { onToast('Error') }
    setDelTarget(null)
  }

  async function deleteTodos() {
    if (!delTarget) return
    try { await deleteTurno(delTarget.turnoId); onToast('Eliminado de todas las semanas') }
    catch { onToast('Error') }
    setDelTarget(null)
  }

  async function deleteUnico() {
    if (!delTarget) return
    try { await deleteTurno(delTarget.turnoId); onToast('Turno eliminado') }
    catch { onToast('Error') }
    setDelTarget(null)
  }

  const ROW_H = 38   // px por slot de 30 min → turno (span 2) = 76px

  function renderCell(t: Turno | undefined, dia: number, h: string, cancha: number, date: Date, row: number, spanned: boolean, last: boolean) {
    if (spanned) return null
    const style: React.CSSProperties = {
      gridColumn: cancha + 1,
      gridRow: t ? `${row} / span 2` : `${row}`,
      ...(last ? { borderRight: 'none' } : {}),
    }
    return (
      <div
        key={`${cancha}-${h}`}
        style={style}
        className="ccell"
        onClick={() => t ? onOpenTurno(t.id) : onOpenTurno(null, dia, h, cancha, ds(date))}
      >
        {t && t.tipo === 'bloqueo' ? (
          /* Celda bloqueada — sin ✕, click abre modal */
          <div className="cblk blk-e" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ fontSize: 11, opacity: .65 }}>🚫</span>
          </div>
        ) : t ? (
          <div className={`cblk ${getTurnoColor(t, alumnos)}`}>
            {t.alumnoIds.slice(0, 4).map((id, ni) => {
              const nombre  = alumnos.find(a => a.id === id)?.nombre ?? ''
              const vencido = vencidosSet.has(id)
              return (
                <span key={ni} className={`cal-tag${vencido ? ' cal-tag-vencido' : ''}`}>
                  {vencido && <span style={{ fontSize: 8, marginRight: 1 }}>🔥</span>}
                  {nombre}
                </span>
              )
            })}
            <span className="cal-type-badge" title={t.fijo ? 'Turno fijo' : 'Turno único'}>
              {t.fijo ? '📌' : '⚡'}
            </span>
            <button className="cal-del-btn" onClick={e => handleDelClick(e, t, date)}>✕</button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div>
      {/* Navegación semanal */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <button className="btn btn-outline-secondary btn-sm px-2" onClick={() => setWeekOff(w => w - 1)} style={{ fontSize: 22, lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>‹</button>
        <span className="fw-bold flex-grow-1 text-center" style={{ fontSize: 14 }}>{weekLabel}</span>
        <button className="btn btn-outline-secondary btn-sm" onClick={goToday}>Hoy</button>
        <button className="btn btn-outline-secondary btn-sm px-2" onClick={() => setWeekOff(w => w + 1)} style={{ fontSize: 22, lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>›</button>
      </div>

      {/* Leyenda */}
      <div className="d-flex flex-wrap mb-3" style={{ fontSize: 11, columnGap: '1rem', rowGap: '0.3rem' }}>
        {[
          ['#C4DEFA', 'Grupal'],
          ['#E0F7FA', 'Individual'],
          ['#EF9A9A', 'Bloqueada'],
        ].map(([c, l]) => (
          <span key={l} className="d-flex align-items-center gap-1 text-muted">
            <span style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block', flexShrink:0 }} />
            {l}
          </span>
        ))}
        <span className="text-muted">📌 Fija &nbsp; ⚡ Unica &nbsp; 🔥 Vencida</span>
      </div>

      {/* Días apilados */}
      {dates.map((date, di) => {
        const dia   = di + 1
        const today = isToday(date)

        return (
          <div
            key={dia}
            ref={weekOff === initWeekOff && di === scrollDi ? scrollRef : undefined}
            className={`cal-day-section${today ? ' today' : ''}`}
          >
            <div className={`cal-day-hdr${today ? ' today' : ''}`}>
              <div className="cal-day-name">{DAYS[dia]}</div>
              <div className="cal-day-date">{date.getDate()} {MONTHS[date.getMonth()]}</div>
              {today && <span className="cal-today-badge">Hoy</span>}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'min-content 1fr 1fr',
              gridTemplateRows: `auto repeat(${HOURS.length}, ${ROW_H}px)`,
            }}>
              {/* Encabezados de cancha — fila 1 */}
              <div style={{ gridColumn:1, gridRow:1 }} className="ctime" />
              <div style={{ gridColumn:2, gridRow:1 }} className="chc c1h">🏟️ Cancha 1</div>
              <div style={{ gridColumn:3, gridRow:1, borderRight:'none' }} className="chc c2h">🏟️ Cancha 2</div>

              {HOURS.map((h, hi) => {
                const row = hi + 2
                const t1  = getSlot(dia, h, 1, date)
                const t2  = getSlot(dia, h, 2, date)
                const s1  = hi > 0 && !!getSlot(dia, HOURS[hi - 1], 1, date)
                const s2  = hi > 0 && !!getSlot(dia, HOURS[hi - 1], 2, date)

                return (
                  <Fragment key={h}>
                    <div style={{ gridColumn:1, gridRow:row }} className="ctime">{h}</div>
                    {renderCell(t1, dia, h, 1, date, row, s1, false)}
                    {renderCell(t2, dia, h, 2, date, row, s2, true)}
                  </Fragment>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Modal eliminar turno */}
      <BSModal show={!!delTarget} onHide={() => setDelTarget(null)} centered size="sm">
        <BSModal.Body className="p-4 text-center">
          <p className="fw-bold mb-1">Eliminar turno</p>
          {delTarget?.fijo ? (
            <>
              <p className="text-muted small mb-4">¿Solo este o todos los siguientes?</p>
              <div className="d-flex gap-2 justify-content-center">
                <Button variant="outline-secondary" onClick={deleteSolo}>Solo este</Button>
                <Button variant="danger" onClick={deleteTodos}>Todos</Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted small mb-4">¿Eliminar este turno? La acción no se puede deshacer.</p>
              <div className="d-flex gap-2 justify-content-center">
                <Button variant="outline-secondary" onClick={() => setDelTarget(null)}>Cancelar</Button>
                <Button variant="danger" onClick={deleteUnico}>Eliminar</Button>
              </div>
            </>
          )}
        </BSModal.Body>
      </BSModal>
    </div>
  )
}
