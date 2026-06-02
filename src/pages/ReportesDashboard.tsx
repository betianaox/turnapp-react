import Card from 'react-bootstrap/Card'
import Row  from 'react-bootstrap/Row'
import Col  from 'react-bootstrap/Col'
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ComposedChart, Line, Legend,
  ResponsiveContainer,
} from 'recharts'

const USER_COLORS  = ['#1A6BBF', '#E67E22', '#8E44AD', '#27AE60', '#16A085']
const CAT_COLORS: Record<string, string> = { Cancha: '#1A6BBF', Bar: '#E67E22', Otro: '#8E44AD' }

export interface DashboardData {
  ingresosPorUser:  { name: string; value: number }[]
  gastosPorCat:     { name: string; value: number }[]
  tendencia:        { name: string; ingresos: number; gastos: number; balance: number }[]
  alumnosPorEstado: { name: string; value: number; color: string }[]
  tasaCobro:        { cobrados: number; total: number }
  clasesPorDia:     { name: string; value: number }[]
  ocupacionHoraria: { name: string; value: number }[]
  topAlumnos:       { name: string; value: number }[]
}

function Empty({ msg }: { msg: string }) {
  return <p className="text-muted text-center py-4 mb-0" style={{ fontSize: 13 }}>{msg}</p>
}

function PieLabel({ cx, cy, midAngle, outerRadius, percent, name }: {
  cx: number; cy: number; midAngle: number; outerRadius: number; percent: number; name: string
}) {
  if (percent < 0.06) return null
  const rad = Math.PI / 180
  const rx  = cx + (outerRadius + 22) * Math.cos(-midAngle * rad)
  const ry  = cy + (outerRadius + 22) * Math.sin(-midAngle * rad)
  return (
    <text x={rx} y={ry} fill="#555" textAnchor={rx > cx ? 'start' : 'end'}
      dominantBaseline="central" style={{ fontSize: 11 }}>
      {name} {(percent * 100).toFixed(0)}%
    </text>
  )
}

const H   = 220
const yFmt = (v: number) => `$${Math.round(v / 1000)}k`

export function ReportesDashboard({
  ingresosPorUser, gastosPorCat, tendencia,
  alumnosPorEstado, tasaCobro, clasesPorDia, ocupacionHoraria, topAlumnos,
}: DashboardData) {
  const { cobrados, total } = tasaCobro
  const pct        = total > 0 ? Math.round((cobrados / total) * 100) : 0
  const gaugeColor = pct >= 80 ? '#2E7D32' : pct >= 50 ? '#FFA000' : '#dc3545'
  const gaugeData  = [
    { value: pct,       fill: gaugeColor },
    { value: 100 - pct, fill: '#e9ecef'  },
  ]

  return (
    <Row className="g-3">

      {/* 1 — Donut: ingresos por usuario */}
      <Col xs={12} md={6}>
        <Card className="border-0 shadow-sm h-100">
          <Card.Body>
            <div className="fw-bold text-uppercase text-muted mb-3" style={{ fontSize: 10, letterSpacing: .5 }}>
              Ingresos por usuario
            </div>
            {!ingresosPorUser.some(d => d.value > 0)
              ? <Empty msg="Sin ingresos en este período" />
              : (
                <ResponsiveContainer width="100%" height={H}>
                  <PieChart>
                    <Pie data={ingresosPorUser} cx="50%" cy="50%"
                      innerRadius={52} outerRadius={82} dataKey="value"
                      labelLine={false} label={PieLabel as any}>
                      {ingresosPorUser.map((_, i) => <Cell key={i} fill={USER_COLORS[i % USER_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )
            }
          </Card.Body>
        </Card>
      </Col>

      {/* 2 — Gauge: tasa de cobro */}
      <Col xs={12} md={6}>
        <Card className="border-0 shadow-sm h-100">
          <Card.Body>
            <div className="fw-bold text-uppercase text-muted mb-1" style={{ fontSize: 10, letterSpacing: .5 }}>
              Tasa de cobro del período
            </div>
            <small className="text-muted d-block mb-1">{cobrados} de {total} alumnos activos cobrados</small>
            {total === 0
              ? <Empty msg="Sin alumnos activos" />
              : (
                <div className="position-relative">
                  <ResponsiveContainer width="100%" height={H}>
                    <PieChart>
                      <Pie
                        data={gaugeData}
                        cx="50%" cy="72%"
                        startAngle={180} endAngle={0}
                        innerRadius={62} outerRadius={98}
                        dataKey="value" strokeWidth={0}
                        paddingAngle={pct > 0 && pct < 100 ? 1 : 0}
                      >
                        {gaugeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="position-absolute text-center w-100" style={{ top: '54%' }}>
                    <div className="fw-black lh-1" style={{ fontSize: 44, color: gaugeColor }}>{pct}%</div>
                  </div>
                </div>
              )
            }
          </Card.Body>
        </Card>
      </Col>

      {/* 3 — Barras: gastos por categoría */}
      <Col xs={12} md={6}>
        <Card className="border-0 shadow-sm h-100">
          <Card.Body>
            <div className="fw-bold text-uppercase text-muted mb-3" style={{ fontSize: 10, letterSpacing: .5 }}>
              Gastos por categoría
            </div>
            {!gastosPorCat.some(d => d.value > 0)
              ? <Empty msg="Sin gastos en este período" />
              : (
                <ResponsiveContainer width="100%" height={H}>
                  <BarChart data={gastosPorCat} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={46} tickFormatter={yFmt} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64}>
                      {gastosPorCat.map(e => <Cell key={e.name} fill={CAT_COLORS[e.name] ?? '#1A6BBF'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </Card.Body>
        </Card>
      </Col>

      {/* 4 — Estado de cobros del período */}
      <Col xs={12} md={6}>
        <Card className="border-0 shadow-sm h-100">
          <Card.Body>
            <div className="fw-bold text-uppercase text-muted mb-3" style={{ fontSize: 10, letterSpacing: .5 }}>
              Alumnos por estado de cobro
            </div>
            {!alumnosPorEstado.some(d => d.value > 0)
              ? <Empty msg="Sin alumnos activos" />
              : (
                <>
                  <ResponsiveContainer width="100%" height={H - 50}>
                    <PieChart>
                      <Pie data={alumnosPorEstado} cx="50%" cy="50%"
                        innerRadius={52} outerRadius={82} dataKey="value"
                        labelLine={false} label={PieLabel as any}>
                        {alumnosPorEstado.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="d-flex flex-wrap justify-content-center gap-2 mt-1">
                    {alumnosPorEstado.map(d => (
                      <span key={d.name} className="d-flex align-items-center gap-1" style={{ fontSize: 11 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, display: 'inline-block', flexShrink: 0 }} />
                        <span className="text-muted">{d.name}</span>
                        <strong>{d.value}</strong>
                      </span>
                    ))}
                  </div>
                </>
              )
            }
          </Card.Body>
        </Card>
      </Col>

      {/* D — Barras horizontales: top alumnos */}
      <Col xs={12} md={6}>
        <Card className="border-0 shadow-sm h-100">
          <Card.Body>
            <div className="fw-bold text-uppercase text-muted mb-3" style={{ fontSize: 10, letterSpacing: .5 }}>
              Top alumnos · monto cobrado
            </div>
            {topAlumnos.length === 0
              ? <Empty msg="Sin cobros en este período" />
              : (
                <ResponsiveContainer width="100%" height={H}>
                  <BarChart data={topAlumnos} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e9ecef" />
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={yFmt} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={74} />
                    <Bar dataKey="value" fill="#1A6BBF" radius={[0, 4, 4, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </Card.Body>
        </Card>
      </Col>

      {/* 4 — Composed: tendencia 6 meses */}
      <Col xs={12} md={6}>
        <Card className="border-0 shadow-sm h-100">
          <Card.Body>
            <div className="fw-bold text-uppercase text-muted mb-1" style={{ fontSize: 10, letterSpacing: .5 }}>
              Tendencia — últimos 6 meses
            </div>
            <small className="text-muted d-block mb-2">Ingresos, gastos y balance neto</small>
            {!tendencia.some(d => d.ingresos > 0 || d.gastos > 0)
              ? <Empty msg="Sin movimientos registrados" />
              : (
                <ResponsiveContainer width="100%" height={H}>
                  <ComposedChart data={tendencia} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={46} tickFormatter={yFmt} />
                    <Legend iconSize={9} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#2E7D32" radius={[3, 3, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="gastos"   name="Gastos"   fill="#dc3545" radius={[3, 3, 0, 0]} maxBarSize={22} />
                    <Line type="monotone" dataKey="balance" name="Balance" stroke="#1A6BBF" strokeWidth={2}
                      dot={{ r: 3, fill: '#1A6BBF', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )
            }
          </Card.Body>
        </Card>
      </Col>

      {/* B — Barras: turnos fijos por día */}
      <Col xs={12} md={6}>
        <Card className="border-0 shadow-sm h-100">
          <Card.Body>
            <div className="fw-bold text-uppercase text-muted mb-3" style={{ fontSize: 10, letterSpacing: .5 }}>
              Turnos fijos por día
            </div>
            {!clasesPorDia.some(d => d.value > 0)
              ? <Empty msg="Sin turnos fijos" />
              : (
                <ResponsiveContainer width="100%" height={H}>
                  <BarChart data={clasesPorDia} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                    <Bar dataKey="value" fill="#1A6BBF" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </Card.Body>
        </Card>
      </Col>

      {/* C — Barras: ocupación por horario */}
      <Col xs={12} md={6}>
        <Card className="border-0 shadow-sm h-100">
          <Card.Body>
            <div className="fw-bold text-uppercase text-muted mb-3" style={{ fontSize: 10, letterSpacing: .5 }}>
              Ocupación por horario
            </div>
            {!ocupacionHoraria.some(d => d.value > 0)
              ? <Empty msg="Sin turnos fijos" />
              : (
                <ResponsiveContainer width="100%" height={H}>
                  <BarChart data={ocupacionHoraria} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                    <Bar dataKey="value" fill="#8E44AD" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </Card.Body>
        </Card>
      </Col>

    </Row>
  )
}
