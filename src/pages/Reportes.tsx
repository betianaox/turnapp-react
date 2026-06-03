import { useState } from 'react'
import Card   from 'react-bootstrap/Card'
import Row    from 'react-bootstrap/Row'
import Col    from 'react-bootstrap/Col'
import Table  from 'react-bootstrap/Table'
import Form   from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'
import { useStore }                from '../lib/store'
import { usePagos, getPagoEstado } from '../lib/pagos'
import { ff, fp }                  from '../lib/utils'
import { ReportesDashboard }       from './ReportesDashboard'
import { MONTHS, DAYS }             from '../constants'

type Vista = 'resumen' | 'dashboard'

function StatCard({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body className="py-2">
        <div className="text-muted fw-bold text-uppercase" style={{ fontSize: 10, letterSpacing: .5 }}>{label}</div>
        <div className="fw-black fs-5" style={{ color: color ?? 'inherit' }}>{value}</div>
        {sub && <small className="text-muted">{sub}</small>}
      </Card.Body>
    </Card>
  )
}

export function Reportes() {
  const { state: { alumnos, turnos, gastos, usuarios } } = useStore()
  const { pagos } = usePagos()

  const [vista,   setVista]   = useState<Vista>('resumen')
  const [mes]                 = useState(() => new Date().toISOString().substring(0, 7))
  const [periodo, setPeriodo] = useState(() => new Date().toISOString().substring(0, 7))

  // ── Alumnos activos ──────────────────────────────────────────
  const alumnosConTurnoFijo = alumnos.filter(a =>
    turnos.some(t => t.alumnoIds.includes(a.id) && t.fijo === true)
  )
  const alumnosActivos = alumnosConTurnoFijo.length

  // ── Filtro principal ─────────────────────────────────────────
  const ingresosMes = pagos
    .filter(p => !!p.fechaPago && (periodo ? p.periodo === periodo : p.fechaPago.startsWith(mes)))
    .reduce((s, p) => s + p.monto, 0)

  const gastosMes      = gastos.filter(g => periodo ? g.periodo === periodo : g.fecha.startsWith(mes))
  const totalGastosMes = gastosMes.reduce((s, g) => s + g.monto, 0)

  // Gastos agrupados por usuario
  const gastosPorUser: Record<string, number> = {}
  gastosMes.forEach(g => {
    if (g.usuarioId) gastosPorUser[g.usuarioId] = (gastosPorUser[g.usuarioId] || 0) + g.monto
  })

  // ── Balance por usuario ──────────────────────────────────────
  const pagosMes = pagos.filter(p => !!p.fechaPago && (periodo ? p.periodo === periodo : p.fechaPago.startsWith(mes)))
  const ingresosPorUser: Record<string, number> = {}
  pagosMes.forEach(p => {
    if (p.usuarioId) ingresosPorUser[p.usuarioId] = (ingresosPorUser[p.usuarioId] || 0) + p.monto
  })

  const usuariosActivos = usuarios.filter(u => u.activo && (u.rol ?? 'profe') !== 'dev')

  const balances = usuariosActivos.map(u => ({
    u,
    ingreso: ingresosPorUser[u.uid] ?? 0,
    gastoU:  gastosPorUser[u.uid] ?? 0,
    balance: (ingresosPorUser[u.uid] ?? 0) - (gastosPorUser[u.uid] ?? 0),
  }))

  const balanceTotal = ingresosMes - totalGastosMes

  // Todos los registros del período (cobrados + pendientes + vencidos)
  const todosPagosPeriodo = pagos.filter(p =>
    periodo ? p.periodo === periodo : (p.fechaPago?.startsWith(mes) || p.proximoPago?.startsWith(mes))
  )

  // ── Detalle pagos cobrados ───────────────────────────────────
  const pagosDelMes = todosPagosPeriodo
    .filter(p => !!p.fechaPago)
    .sort((a, b) => a.fechaPago!.localeCompare(b.fechaPago!))

  // ── Dashboard data ───────────────────────────────────────────
  const ingresosPorUserData = balances
    .filter(b => b.ingreso > 0)
    .map(b => ({ name: b.u.displayName || b.u.email.split('@')[0], value: Math.round(b.ingreso) }))

  const gastosAgrCat: Record<string, number> = {}
  gastosMes.forEach(g => {
    const label = g.cat === 'cancha' ? 'Cancha' : g.cat === 'bar' ? 'Bar' : 'Otro'
    gastosAgrCat[label] = (gastosAgrCat[label] || 0) + g.monto
  })
  const gastosPorCatData = Object.entries(gastosAgrCat).map(([name, value]) => ({ name, value }))

  // ── Tendencia últimos 6 meses (independiente del filtro activo) ──
  const tendenciaData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (5 - i))
    const m   = d.toISOString().substring(0, 7)
    const ing = pagos
      .filter(p => !!p.fechaPago && (p.periodo ?? p.fechaPago.substring(0, 7)) === m)
      .reduce((s, p) => s + p.monto, 0)
    const gst = gastos
      .filter(g => (g.periodo ?? g.fecha.substring(0, 7)) === m)
      .reduce((s, g) => s + g.monto, 0)
    return { name: MONTHS[d.getMonth()], ingresos: Math.round(ing), gastos: Math.round(gst), balance: Math.round(ing - gst) }
  })

  // A — Alumnos por estado de cobro en el período
  const alumnosPorEstadoData = (() => {
    const counts = { pagado: 0, pendiente: 0, vencido: 0, sinCobro: 0 }
    alumnosConTurnoFijo.forEach(a => {
      const pago = todosPagosPeriodo.find(p => p.alumnoId === a.id)
      if (!pago) { counts.sinCobro++ }
      else {
        const e = getPagoEstado(pago)
        if (e === 'pagado')   counts.pagado++
        else if (e === 'vencido') counts.vencido++
        else counts.pendiente++
      }
    })
    return [
      { name: 'Pagado',    value: counts.pagado,    color: '#2E7D32' },
      { name: 'Pendiente', value: counts.pendiente, color: '#1A6BBF' },
      { name: 'Vencido',   value: counts.vencido,   color: '#dc3545' },
      { name: 'Sin cobro', value: counts.sinCobro,  color: '#adb5bd' },
    ].filter(d => d.value > 0)
  })()

  // B — Turnos fijos por día de la semana
  const clasesPorDiaData = [1, 2, 3, 4, 5, 6].map(dia => ({
    name:  DAYS[dia],
    value: turnos.filter(t => t.fijo && t.dia === dia).length,
  }))

  // C — Ocupación por horario
  const horasCounts: Record<string, number> = {}
  turnos.filter(t => t.fijo).forEach(t => {
    horasCounts[t.hora] = (horasCounts[t.hora] || 0) + 1
  })
  const ocupacionHorariaData = Object.entries(horasCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([h, value]) => ({ name: parseInt(h) + 'h', value }))

  // E — Tasa de cobro del período
  const pagadosIds    = new Set(pagosDelMes.map(p => p.alumnoId))
  const tasaCobroData = {
    cobrados: alumnosConTurnoFijo.filter(a => pagadosIds.has(a.id)).length,
    total:    alumnosActivos,
  }

  // F — Heatmap ocupación día × hora
  const heatmapData = (() => {
    const counts: Record<string, number> = {}
    turnos.filter(t => t.fijo && t.tipo !== 'bloqueo').forEach(t => {
      const key = `${t.dia}|${t.hora}`
      counts[key] = (counts[key] || 0) + 1
    })
    return Object.entries(counts).map(([key, value]) => {
      const [dia, hora] = key.split('|')
      return { dia: Number(dia), hora, value }
    })
  })()

  // G — Funnel de cobros
  const conCobroIds    = new Set(todosPagosPeriodo.map(p => p.alumnoId))
  const funnelCobrosData = [
    { name: 'Alumnos activos',  value: alumnosActivos,   color: '#1A6BBF' },
    { name: 'Con cobro cargado', value: conCobroIds.size, color: '#FFA000' },
    { name: 'Cobrado',           value: pagadosIds.size,  color: '#2E7D32' },
  ]

  // ── Comparación vs período anterior ─────────────────────────
  const periodoActual   = periodo || mes
  const [pyStr, pmStr]  = periodoActual.split('-')
  const prevDate        = new Date(parseInt(pyStr), parseInt(pmStr) - 2)
  const periodoAnterior = prevDate.toISOString().substring(0, 7)

  const ingresosAnterior = pagos
    .filter(p => !!p.fechaPago && (p.periodo ?? p.fechaPago.substring(0, 7)) === periodoAnterior)
    .reduce((s, p) => s + p.monto, 0)
  const gastosAnterior = gastos
    .filter(g => (g.periodo ?? g.fecha.substring(0, 7)) === periodoAnterior)
    .reduce((s, g) => s + g.monto, 0)

  const periodoActualNombre   = MONTHS[parseInt(pmStr) - 1]
  const periodoAnteriorNombre = MONTHS[parseInt(periodoAnterior.split('-')[1]) - 1]

  const comparacionData = [
    { name: 'Ingresos', actual: Math.round(ingresosMes),    anterior: Math.round(ingresosAnterior) },
    { name: 'Gastos',   actual: Math.round(totalGastosMes), anterior: Math.round(gastosAnterior)   },
    { name: 'Balance',  actual: Math.round(balanceTotal),   anterior: Math.round(ingresosAnterior - gastosAnterior) },
  ]

  return (
    <>
      {/* Barra superior: sub-tabs + filtros */}
      <div className="filter-bar mb-3">
        <div className="d-flex gap-2 align-items-center filter-row">
          {/* Sub-tabs */}
          <div className="flex-shrink-0">
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className={`btn ${vista === 'resumen' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setVista('resumen')}
                title="Resumen"
              >
                🧾<span className="d-none d-md-inline ms-1">Resumen</span>
              </button>
              <button
                type="button"
                className={`btn ${vista === 'dashboard' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setVista('dashboard')}
                title="Dashboard"
              >
                📈<span className="d-none d-md-inline ms-1">Dashboard</span>
              </button>
            </div>
          </div>

          {/* Periodo */}
          <div className="ms-auto d-flex align-items-center gap-1">
            <Form.Control type="month" lang="es-AR" size="sm" style={{ maxWidth: 148 }}
              value={periodo} onChange={e => setPeriodo(e.target.value)} title="Período contable" />
            {periodo && <Button variant="outline-secondary" size="sm" onClick={() => setPeriodo('')}>✕</Button>}
          </div>
        </div>
      </div>

      <hr className="section-sep" />

      {/* ── VISTA: RESUMEN ── */}
      {vista === 'resumen' && (
        <>
          {/* KPIs */}
          <Row className="g-2 mb-3">
            <Col xs={6} md={3}>
              <StatCard label="Alumnos activos" value={String(alumnosActivos)} color="#1A6BBF" sub={`de ${alumnos.length} registrados`} />
            </Col>
            <Col xs={6} md={3}>
              <StatCard label="Ingresos del mes" value={fp(ingresosMes)} color="#2E7D32" sub={`${pagosDelMes.length} cobros`} />
            </Col>
            <Col xs={6} md={3}>
              <StatCard label="Gastos del mes" value={fp(totalGastosMes)} color="#dc3545" sub={`${gastosMes.length} gastos`} />
            </Col>
            <Col xs={6} md={3}>
              <StatCard label="Balance neto" value={fp(balanceTotal)} color={balanceTotal >= 0 ? '#2E7D32' : '#dc3545'} />
            </Col>
          </Row>

          {/* Balance por usuario */}
          {usuariosActivos.length > 0 && (
            <Card className="border-0 shadow-sm mb-3">
              <Card.Body>
                <div className="fw-bold text-uppercase text-muted mb-2" style={{ fontSize: 10, letterSpacing: .5 }}>
                  Balance neto por usuario
                </div>
                <small className="text-muted d-block mb-2">
                  Total ingresos: {fp(ingresosMes)} · asignados por cobro
                </small>

                {/* Mobile */}
                <div className="d-md-none d-flex flex-column gap-2">
                  {balances.map(({ u, ingreso, gastoU, balance }) => (
                    <div key={u.uid} className="d-flex justify-content-between align-items-center p-2 rounded" style={{ background: '#f8f9fa', fontSize: 13 }}>
                      <span className="fw-semibold">{u.displayName || u.email}</span>
                      <div className="text-end">
                        <div className={`fw-bold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>{fp(Math.round(balance))}</div>
                        <small className="text-muted">{fp(Math.round(ingreso))} − {fp(gastoU)}</small>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop */}
                <Table size="sm" className="mb-0 d-none d-md-table">
                  <thead className="table-light">
                    <tr>
                      <th>Usuario</th>
                      <th className="text-end">Ingreso parte</th>
                      <th className="text-end">Gastos</th>
                      <th className="text-end">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map(({ u, ingreso, gastoU, balance }) => (
                      <tr key={u.uid}>
                        <td className="fw-semibold">{u.displayName || u.email}</td>
                        <td className="text-end text-success">{fp(Math.round(ingreso))}</td>
                        <td className="text-end text-danger">{fp(gastoU)}</td>
                        <td className={`text-end fw-bold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>{fp(Math.round(balance))}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}

          {/* Gastos del mes */}
          {gastosMes.length > 0 && (
            <Card className="border-0 shadow-sm mb-3">
              <Card.Body>
                <div className="fw-bold text-uppercase text-muted mb-2" style={{ fontSize: 10, letterSpacing: .5 }}>
                  Gastos del mes
                </div>
                {/* Mobile */}
                <div className="d-md-none d-flex flex-column gap-1 mb-1">
                  {[...gastosMes].sort((a, b) => b.fecha.localeCompare(a.fecha)).map(g => {
                    const icon = g.cat === 'cancha' ? '💸' : g.cat === 'bar' ? '🍺' : '📦'
                    const u    = usuarios.find(x => x.uid === g.usuarioId)
                    return (
                      <div key={g.id} className="d-flex justify-content-between py-1 border-bottom" style={{ fontSize: 12 }}>
                        <div>
                          <span className="fw-semibold">{g.desc || '—'}</span>
                          <small className="text-muted d-block">{icon} {ff(g.fecha)}{u?.displayName ? <> · <span style={{ fontSize: 10 }}>{u.displayName}</span></> : ''}</small>
                        </div>
                        <span className="fw-bold text-danger">{fp(g.monto)}</span>
                      </div>
                    )
                  })}
                  <div className="d-flex justify-content-between fw-bold pt-1" style={{ fontSize: 13 }}>
                    <span>Total gastos</span><span className="text-danger">{fp(totalGastosMes)}</span>
                  </div>
                </div>
                {/* Desktop */}
                <Table size="sm" className="mb-0 d-none d-md-table">
                  <thead className="table-light">
                    <tr><th>Descripción</th><th>Categoría</th><th>Usuario</th><th className="text-end">Monto</th></tr>
                  </thead>
                  <tbody>
                    {[...gastosMes].sort((a, b) => b.fecha.localeCompare(a.fecha)).map(g => {
                      const u    = usuarios.find(x => x.uid === g.usuarioId)
                      const icon = g.cat === 'cancha' ? '💸' : g.cat === 'bar' ? '🍺' : '📦'
                      return (
                        <tr key={g.id}>
                          <td>{g.desc || '—'}<small className="text-muted d-block">{ff(g.fecha)}</small></td>
                          <td><small>{icon} {g.cat}</small></td>
                          <td><small className="text-muted">{u?.displayName || '—'}</small></td>
                          <td className="text-end fw-semibold text-danger">{fp(g.monto)}</td>
                        </tr>
                      )
                    })}
                    <tr className="table-light fw-bold">
                      <td colSpan={3} className="text-end">Total gastos</td>
                      <td className="text-end text-danger">{fp(totalGastosMes)}</td>
                    </tr>
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}

          {/* Cobros del mes */}
          {pagosDelMes.length > 0 && (
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="fw-bold text-uppercase text-muted mb-2" style={{ fontSize: 10, letterSpacing: .5 }}>
                  Cobros del mes
                </div>
                {/* Mobile */}
                <div className="d-md-none d-flex flex-column gap-1 mb-1">
                  {pagosDelMes.map(p => {
                    const a = alumnos.find(x => x.id === p.alumnoId)
                    return (
                      <div key={p.id} className="d-flex justify-content-between py-1 border-bottom" style={{ fontSize: 12 }}>
                        <div>
                          <span className="fw-semibold text-uppercase">{a ? a.nombre : '—'}</span>
                          <small className="text-muted d-block">{ff(p.fechaPago!)}</small>
                        </div>
                        <span className="fw-bold text-success">{fp(p.monto)}</span>
                      </div>
                    )
                  })}
                  <div className="d-flex justify-content-between fw-bold pt-1" style={{ fontSize: 13 }}>
                    <span>Total cobrado</span><span className="text-success">{fp(ingresosMes)}</span>
                  </div>
                </div>
                {/* Desktop */}
                <Table size="sm" className="mb-0 d-none d-md-table">
                  <thead className="table-light">
                    <tr><th>Alumno</th><th>Vencimiento</th><th>Fecha cobro</th><th className="text-end">Monto</th></tr>
                  </thead>
                  <tbody>
                    {pagosDelMes.map(p => {
                      const a = alumnos.find(x => x.id === p.alumnoId)
                      return (
                        <tr key={p.id}>
                          <td className="text-uppercase fw-semibold" style={{ fontSize: 12 }}>
                            {a ? a.nombre : '—'}
                          </td>
                          <td><small className="text-muted">{ff(p.proximoPago)}</small></td>
                          <td><small>{ff(p.fechaPago!)}</small></td>
                          <td className="text-end fw-semibold text-success">{fp(p.monto)}</td>
                        </tr>
                      )
                    })}
                    <tr className="table-light fw-bold">
                      <td colSpan={3} className="text-end">Total cobrado</td>
                      <td className="text-end text-success">{fp(ingresosMes)}</td>
                    </tr>
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}
        </>
      )}

      {/* ── VISTA: DASHBOARD ── */}
      {vista === 'dashboard' && (
        <ReportesDashboard
          ingresosPorUser={ingresosPorUserData}
          gastosPorCat={gastosPorCatData}
          tendencia={tendenciaData}
          alumnosPorEstado={alumnosPorEstadoData}
          tasaCobro={tasaCobroData}
          clasesPorDia={clasesPorDiaData}
          ocupacionHoraria={ocupacionHorariaData}
          heatmap={heatmapData}
          funnelCobros={funnelCobrosData}
          comparacionPeriodos={comparacionData}
          periodoActualNombre={periodoActualNombre}
          periodoAnteriorNombre={periodoAnteriorNombre}
        />
      )}
    </>
  )
}
