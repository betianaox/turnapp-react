import { useState, useEffect } from 'react'
import Table      from 'react-bootstrap/Table'
import Form       from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'
import Button     from 'react-bootstrap/Button'
import Badge      from 'react-bootstrap/Badge'
import Card       from 'react-bootstrap/Card'
import Pagination from 'react-bootstrap/Pagination'
import { useStore }                          from '../lib/store'
import { fp, ff, todayKey, periodoLabel }    from '../lib/utils'
import type { CatGasto } from '../types'

const PER_PAGE = 10

const CAT_INFO: Record<CatGasto, { icon: string; label: string; bg: string }> = {
  cancha: { icon: '💸', label: 'Cancha',  bg: 'primary'   },
  bar:    { icon: '🍺', label: 'Bar',     bg: 'warning'   },
  otro:   { icon: '📦', label: 'Otro',    bg: 'secondary' },
}

interface Props {
  onOpenGasto:       (id: string | null) => void
  activePeriodo?:    string   // período seleccionado actualmente (para pre-fill en new)
  onPeriodoChange?:  (p: string) => void
}

export function Gastos({ onOpenGasto, activePeriodo, onPeriodoChange }: Props) {
  const { state: { gastos, usuarios } } = useStore()
  const nowKey = todayKey()

  const lastActive = gastos.length
    ? [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha))[0].fecha.substring(0, 7)
    : nowKey

  const [mes] = useState(lastActive)
  const [periodo,     setPeriodo]      = useState(activePeriodo ?? new Date().toISOString().substring(0, 7))
  const [filterUser,  setFilterUser]   = useState('')
  const [filterCat,   setFilterCat]    = useState<CatGasto | ''>('')
  const [search,      setSearch]       = useState('')
  const [currentPage, setCurrentPage]  = useState(1)

  useEffect(() => setCurrentPage(1), [mes, periodo, filterUser, filterCat, search])

  function userName(uid: string) {
    const u = usuarios.find(x => x.uid === uid)
    return u ? (u.displayName || u.email) : '—'
  }

  // Filtrar: si hay período activo filtra por periodo, si no por mes (fecha)
  let filtered = periodo
    ? gastos.filter(g => g.periodo === periodo)
    : gastos.filter(g => g.fecha.startsWith(mes))

  if (filterUser) filtered = filtered.filter(g => g.usuarioId === filterUser)
  if (filterCat)  filtered = filtered.filter(g => g.cat === filterCat)
  if (search)     filtered = filtered.filter(g =>
    g.desc.toLowerCase().includes(search.toLowerCase()) ||
    userName(g.usuarioId).toLowerCase().includes(search.toLowerCase())
  )

  const sorted    = [...filtered].sort((a, b) => b.fecha.localeCompare(a.fecha))
  const total     = sorted.reduce((s, g) => s + Number(g.monto), 0)
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE))
  const page       = Math.min(currentPage, totalPages)
  const rows       = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function handlePeriodoChange(val: string) {
    setPeriodo(val)
    onPeriodoChange?.(val)
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h6 className="fw-bold mb-0">💸 Gastos</h6>
        <span className="fw-black fs-6 text-danger">{fp(total)}</span>
      </div>

      {/* Filtros */}
      <div className="filter-bar mb-3">
        <InputGroup size="sm" style={{ maxWidth: 210 }}>
          <InputGroup.Text>🔍</InputGroup.Text>
          <Form.Control placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <Button variant="outline-secondary" onClick={() => setSearch('')}>✕</Button>}
        </InputGroup>

        {/* Período */}
        <div className="d-flex align-items-center gap-1">
          <Form.Control type="month" lang="es-AR" size="sm" style={{ maxWidth: 148 }}
            value={periodo} onChange={e => handlePeriodoChange(e.target.value)} />
          {periodo && <Button variant="outline-secondary" size="sm" onClick={() => handlePeriodoChange('')}>✕</Button>}
        </div>

        <Form.Select size="sm" style={{ maxWidth: 155 }} value={filterUser} onChange={e => setFilterUser(e.target.value)}>
          <option value="">Todos los usuarios</option>
          {[...usuarios].filter(u => (u.rol ?? 'profe') === 'profe').sort((a,b) => (a.displayName||a.email).localeCompare(b.displayName||b.email)).map(u => (
            <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
          ))}
        </Form.Select>

        <Form.Select size="sm" style={{ maxWidth: 130 }} value={filterCat} onChange={e => setFilterCat(e.target.value as CatGasto | '')}>
          <option value="">Categorías</option>
          <option value="cancha">💸 Cancha</option>
          <option value="bar">🍺 Bar</option>
          <option value="otro">📦 Otro</option>
        </Form.Select>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <div style={{ fontSize: 40 }} className="mb-2">💸</div>
          <div className="fw-bold">Sin gastos</div>
          <Button variant="primary" className="mt-3" onClick={() => onOpenGasto(null)}>+ Nuevo gasto</Button>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="d-md-none d-flex flex-column gap-2">
            {rows.map(g => {
              const cat = CAT_INFO[g.cat as CatGasto] ?? CAT_INFO.otro
              return (
                <Card key={g.id} className="border-0 shadow-sm cursor-pointer"
                  onClick={() => onOpenGasto(g.id)} role="button" style={{ cursor: 'pointer' }}>
                  <Card.Body className="py-2 px-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <Badge bg={cat.bg} className="fw-normal">{cat.icon} {cat.label}</Badge>
                        {g.periodo && <Badge bg="info" text="dark" className="fw-normal" style={{ fontSize: 10 }}>{periodoLabel(g.periodo)}</Badge>}
                        <span className="fw-semibold">{g.desc}</span>
                      </div>
                      <span className="fw-black text-danger">{fp(g.monto)}</span>
                    </div>
                    <div className="d-flex gap-3 mt-1" style={{ fontSize: 11 }}>
                      <span className="text-muted">{ff(g.fecha)}</span>
                      <span className="text-muted">{userName(g.usuarioId)}</span>
                    </div>
                  </Card.Body>
                </Card>
              )
            })}
          </div>

          {/* Desktop: tabla */}
          <div className="d-none d-md-block table-responsive rounded shadow-sm">
            <Table hover className="mb-0 align-middle bg-white">
              <thead className="table-light">
                <tr>
                  <th>Período</th>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Usuario</th>
                  <th className="text-end">Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(g => {
                  const cat = CAT_INFO[g.cat as CatGasto] ?? CAT_INFO.otro
                  return (
                    <tr key={g.id}>
                      <td>
                        {g.periodo
                          ? <Badge bg="info" text="dark" className="fw-normal" style={{ fontSize: 11 }}>{periodoLabel(g.periodo)}</Badge>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td><small className="text-muted">{ff(g.fecha)}</small></td>
                      <td><Badge bg={cat.bg} className="fw-normal">{cat.icon} {cat.label}</Badge></td>
                      <td>
                        <div>{g.desc}</div>
                        {g.notas && <small className="text-muted">{g.notas}</small>}
                      </td>
                      <td><small className="text-muted">{userName(g.usuarioId)}</small></td>
                      <td className="text-end fw-bold text-danger">{fp(g.monto)}</td>
                      <td>
                        <Button variant="outline-secondary" size="sm" onClick={() => onOpenGasto(g.id)}>Editar</Button>
                      </td>
                    </tr>
                  )
                })}
                <tr className="table-light fw-bold">
                  <td colSpan={5} className="text-end">Total</td>
                  <td className="text-end text-danger">{fp(total)}</td>
                  <td></td>
                </tr>
              </tbody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <small className="text-muted">
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, sorted.length)} de {sorted.length}
              </small>
              <Pagination size="sm" className="mb-0">
                <Pagination.Prev disabled={page === 1} onClick={() => setCurrentPage(p => p - 1)} />
                {Array.from({ length: totalPages }, (_, i) => (
                  <Pagination.Item key={i + 1} active={i + 1 === page} onClick={() => setCurrentPage(i + 1)}>
                    {i + 1}
                  </Pagination.Item>
                ))}
                <Pagination.Next disabled={page === totalPages} onClick={() => setCurrentPage(p => p + 1)} />
              </Pagination>
            </div>
          )}
        </>
      )}
    </>
  )
}
