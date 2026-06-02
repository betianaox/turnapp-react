import { useState, useEffect } from 'react'
import Table      from 'react-bootstrap/Table'
import Form       from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'
import Button     from 'react-bootstrap/Button'
import Pagination from 'react-bootstrap/Pagination'
import Badge      from 'react-bootstrap/Badge'
import Card       from 'react-bootstrap/Card'
import { useStore }       from '../lib/store'
import { useAuth }        from '../lib/auth'
import { ff }             from '../lib/utils'
import { ConfirmModal }   from '../components/ConfirmModal'

const PER_PAGE = 8

interface Props { onToast: (msg: string) => void }

export function Accesos({ onToast }: Props) {
  const { user }                                           = useAuth()
  const { state: { usuarios }, setUsuarioActivo, setUsuarioRol, deleteUsuario } = useStore()

  const [search,      setSearch]      = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [confirmUid,  setConfirmUid]  = useState<string | null>(null)

  useEffect(() => setCurrentPage(1), [search])

  const myRol  = usuarios.find(u => u.uid === user?.uid)?.rol ?? 'profe'
  const isDev  = myRol === 'dev'

  const sorted = [...usuarios]
    .sort((a, b) => {
      if (a.activo !== b.activo) return a.activo ? -1 : 1
      return a.displayName.localeCompare(b.displayName)
    })

  const filtered = sorted.filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const page       = Math.min(currentPage, totalPages)
  const rows       = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  async function handleToggle(uid: string, activo: boolean) {
    try {
      await setUsuarioActivo(uid, activo)
      onToast(activo ? 'Usuario activado ✓' : 'Usuario desactivado')
    } catch {
      onToast('Error al actualizar')
    }
  }

  async function handleDelete(uid: string, _name: string) {
    try { await deleteUsuario(uid); onToast('Usuario eliminado') }
    catch { onToast('Error al eliminar') }
  }

  const UserAvatar = ({ u }: { u: typeof rows[0] }) => (
    <div
      className="rounded-circle overflow-hidden flex-shrink-0 d-flex align-items-center justify-content-center fw-bold"
      style={{ width: 38, height: 38, fontSize: 14, background: u.activo ? '#e8f2fc' : '#f0f0f0', color: u.activo ? '#1A6BBF' : '#aaa' }}
    >
      {u.photoURL
        ? <img src={u.photoURL} width={38} height={38} referrerPolicy="no-referrer" style={{ objectFit: 'cover', display: 'block' }} alt="" />
        : (u.displayName[0] || u.email[0] || '?').toUpperCase()
      }
    </div>
  )

  const ActiveBadge = ({ activo }: { activo: boolean }) => (
    <Badge bg={activo ? 'success' : 'secondary'} className="fw-normal">
      {activo ? 'Activo' : 'Inactivo'}
    </Badge>
  )

  if (sorted.length === 0) return (
    <div className="text-center py-5 text-muted">
      <div style={{ fontSize: 40 }} className="mb-2">👤</div>
      <div className="fw-bold">Ningún usuario se registró todavía</div>
    </div>
  )

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h6 className="fw-bold mb-0">Usuarios</h6>
        <div className="d-flex gap-2">
          <Badge bg="success" className="fw-normal">{sorted.filter(u => u.activo).length} activos</Badge>
          <Badge bg="secondary" className="fw-normal">{sorted.filter(u => !u.activo).length} inactivos</Badge>
        </div>
      </div>

      <InputGroup className="mb-3">
        <InputGroup.Text>🔍</InputGroup.Text>
        <Form.Control
          placeholder="Buscar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <Button variant="outline-secondary" onClick={() => setSearch('')}>✕</Button>}
      </InputGroup>

      {filtered.length === 0 ? (
        <p className="text-muted text-center py-4">Sin resultados para "{search}"</p>
      ) : (
        <>
          {/* ── Mobile: cards ──────────────────────────────────── */}
          <div className="d-md-none d-flex flex-column gap-3">
            {rows.map(u => {
              const isMe     = u.uid === user?.uid
              const canEdit  = isDev || (u.rol ?? 'profe') !== 'dev'
              return (
                <Card key={u.uid} className={`border-0 shadow-sm ${!u.activo ? 'opacity-75' : ''}`}>
                  <Card.Body>
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <UserAvatar u={u} />
                      <div className="min-w-0 flex-grow-1">
                        <div className="fw-bold text-truncate">
                          {u.displayName || '—'}
                          {isMe && <Badge bg="light" text="dark" className="ms-2 fw-normal border" style={{ fontSize: 9 }}>vos</Badge>}
                        </div>
                        <small className="text-muted d-block text-truncate">{u.email}</small>
                        <small className="text-muted">Últ. acceso: {ff(u.ultimoLogin)}</small>
                      </div>
                      <ActiveBadge activo={u.activo} />
                    </div>

                    <div className="d-flex gap-2">
                      <Form.Select size="sm" style={{ maxWidth: 90 }} disabled={!canEdit}
                        value={u.rol ?? 'profe'}
                        onChange={e => setUsuarioRol(u.uid, e.target.value as 'dev'|'profe')}>
                        <option value="profe">Profe</option>
                        {isDev && <option value="dev">Dev</option>}
                      </Form.Select>
                      <Button
                        variant={u.activo ? 'outline-secondary' : 'success'}
                        size="sm"
                        className="flex-grow-1 fw-semibold"
                        disabled={!canEdit}
                        onClick={() => handleToggle(u.uid, !u.activo)}
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        disabled={!canEdit}
                        onClick={() => setConfirmUid(u.uid)}
                      >
                        🗑
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              )
            })}
          </div>

          {/* ── Desktop: tabla ─────────────────────────────────── */}
          <div className="d-none d-md-block table-responsive rounded shadow-sm">
            <Table hover className="mb-0 align-middle bg-white">
              <thead className="table-light">
                <tr>
                  <th>Usuario</th>
                  <th>Estado</th>
                  <th>Primer login</th>
                  <th>Últ. acceso</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(u => {
                  const isMe    = u.uid === user?.uid
                  const canEdit = isDev || (u.rol ?? 'profe') !== 'dev'
                  return (
                    <tr key={u.uid} className={!u.activo ? 'text-muted' : ''}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <UserAvatar u={u} />
                          <div className="min-w-0">
                            <div className="fw-semibold text-truncate" style={{ maxWidth: 180 }}>
                              {u.displayName || '—'}
                              {isMe && <Badge bg="light" text="dark" className="ms-1 fw-normal border" style={{ fontSize: 9 }}>vos</Badge>}
                            </div>
                            <small className="text-muted text-truncate d-block" style={{ maxWidth: 180 }}>{u.email}</small>
                          </div>
                        </div>
                      </td>
                      <td><ActiveBadge activo={u.activo} /></td>
                      <td><small className="text-muted">{ff(u.primerLogin)}</small></td>
                      <td><small className="text-muted">{ff(u.ultimoLogin)}</small></td>
                      <td>
                        <div className="d-flex gap-2 justify-content-end align-items-center">
                          <Form.Select size="sm" style={{ maxWidth: 85 }} disabled={!canEdit}
                            value={u.rol ?? 'profe'}
                            onChange={e => setUsuarioRol(u.uid, e.target.value as 'dev'|'profe')}>
                            <option value="profe">Profe</option>
                            {isDev && <option value="dev">Dev</option>}
                          </Form.Select>
                          <Button
                            variant={u.activo ? 'outline-secondary' : 'success'}
                            size="sm"
                            className="fw-semibold"
                            disabled={!canEdit}
                            onClick={() => handleToggle(u.uid, !u.activo)}
                          >
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            disabled={!canEdit}
                            onClick={() => setConfirmUid(u.uid)}
                          >
                            🗑
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <small className="text-muted">
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} de {filtered.length}
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
      <ConfirmModal
        open={!!confirmUid}
        title="Eliminar usuario"
        message="¿Eliminar este usuario? La acción no se puede deshacer."
        onConfirm={() => { const uid = confirmUid!; setConfirmUid(null); handleDelete(uid, '') }}
        onCancel={() => setConfirmUid(null)}
      />
    </>
  )
}
