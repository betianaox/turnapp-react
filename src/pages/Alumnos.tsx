import { useState } from 'react'
import Table      from 'react-bootstrap/Table'
import Form       from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'
import Button     from 'react-bootstrap/Button'
import Card       from 'react-bootstrap/Card'
import Badge      from 'react-bootstrap/Badge'
import { useStore }  from '../lib/store'
import { DAYS }      from '../constants'
import type { Turno } from '../types'

function Horarios({ alumnoId, turnos }: { alumnoId: string; turnos: Turno[] }) {
  const mine = turnos
    .filter(t => t.alumnoIds.includes(alumnoId) && t.fijo === true)
    .sort((a, b) => a.dia - b.dia || a.hora.localeCompare(b.hora))

  if (!mine.length) return <span className="text-muted" style={{ fontSize: 12 }}>—</span>

  return (
    <div className="d-flex flex-wrap gap-1">
      {mine.map(t => (
        <Badge key={t.id} bg={t.cancha === 1 ? 'primary' : 'secondary'} className="fw-normal" style={{ fontSize: 11 }}>
          {DAYS[t.dia]} {t.hora}
        </Badge>
      ))}
    </div>
  )
}

interface Props { onOpenAlumno: (id: string | null) => void }

export function Alumnos({ onOpenAlumno }: Props) {
  const { state: { alumnos, turnos } } = useStore()
  const [query, setQuery] = useState('')

  const sorted = [...alumnos].sort((a, b) => a.nombre.localeCompare(b.nombre))

  const list = sorted.filter(a =>
    `${a.nombre} ${a.tel ?? ''}`.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h6 className="fw-bold mb-0">Alumnos</h6>
        <Badge bg="secondary" className="fw-normal">{alumnos.length} total</Badge>
      </div>

      <InputGroup size="sm" className="mb-3 search-bar">
        <InputGroup.Text>🔍</InputGroup.Text>
        <Form.Control
          placeholder="Buscar..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && <Button variant="outline-secondary" onClick={() => setQuery('')}>✕</Button>}
      </InputGroup>

      {list.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <div style={{ fontSize: 48 }} className="mb-2">👥</div>
          <div className="fw-bold">{query ? 'Sin resultados' : 'Sin alumnos todavía'}</div>
          {!query && <Button variant="primary" className="mt-3" onClick={() => onOpenAlumno(null)}>+ Nuevo alumno</Button>}
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="d-md-none d-flex flex-column gap-2">
            {list.map(a => (
              <Card key={a.id} className="border-0 shadow-sm" onClick={() => onOpenAlumno(a.id)} role="button" style={{ cursor: 'pointer' }}>
                <Card.Body className="py-2 px-3">
                  <div className="fw-bold text-uppercase">{a.nombre}</div>
                  {a.tel && <small className="text-muted d-block">{a.tel}</small>}
                  <div className="mt-1"><Horarios alumnoId={a.id} turnos={turnos} /></div>
                </Card.Body>
              </Card>
            ))}
          </div>

          {/* Desktop */}
          <div className="d-none d-md-block table-responsive rounded shadow-sm">
            <Table hover className="mb-0 align-middle bg-white">
              <thead className="table-light">
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Horarios</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map(a => (
                  <tr key={a.id}>
                    <td className="fw-semibold text-uppercase">{a.nombre}</td>
                    <td><small className="text-muted">{a.tel || '—'}</small></td>
                    <td><Horarios alumnoId={a.id} turnos={turnos} /></td>
                    <td><Button variant="outline-primary" size="sm" onClick={() => onOpenAlumno(a.id)}>Editar</Button></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </>
  )
}
