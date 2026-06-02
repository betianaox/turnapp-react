import { useRef, useState, useCallback } from 'react'
import Navbar  from 'react-bootstrap/Navbar'
import Nav     from 'react-bootstrap/Nav'
import Badge   from 'react-bootstrap/Badge'
import Button  from 'react-bootstrap/Button'
import BSModal from 'react-bootstrap/Modal'

import { StoreProvider, useStore } from './lib/store'
import { AuthProvider, useAuth }   from './lib/auth'
import { usePagos } from './lib/pagos'
import { Toast, type ToastHandle } from './components/Toast'

import { Calendario }  from './pages/Calendario'
import { Alumnos }     from './pages/Alumnos'
import { Gastos }      from './pages/Gastos'
import { Avisos }      from './pages/Avisos'
import { Reportes }    from './pages/Reportes'
import { Accesos }     from './pages/Accesos'
import { Cobros }      from './pages/Cobros'
import { LoginScreen } from './pages/LoginScreen'

import { TurnoModal }  from './modals/TurnoModal'
import { AlumnoModal } from './modals/AlumnoModal'
import { GastoModal }  from './modals/GastoModal'

import type { PageId } from './types'

type ModalState =
  | { type: 'none' }
  | { type: 'turno';  editId: string | null; prefillDia?: number; prefillHora?: string; prefillCancha?: number; prefillFecha?: string }
  | { type: 'alumno'; editId: string | null }
  | { type: 'gasto';  editId: string | null }

const TABS: { id: PageId; icon: string; label: string }[] = [
  { id: 'cal',      icon: '📆', label: 'Calendario' },
  { id: 'alumnos',  icon: '👥', label: 'Alumnos'    },
  { id: 'gastos',   icon: '💸', label: 'Gastos'     },
  { id: 'cobros',   icon: '💰', label: 'Cobros'     },
  { id: 'avisos',   icon: '🔔', label: 'Avisos'     },
  { id: 'reportes', icon: '📊', label: 'Reportes'   },
  { id: 'accesos',  icon: '🔑', label: 'Accesos'    },
]
const NO_FAB: PageId[] = ['cal', 'avisos', 'reportes', 'accesos']

function LoadingScreen() {
  return (
    <div className="role-screen">
      <div className="role-logo-btn">📅</div>
      <p className="fw-bold fs-4 mb-3">TurnApp</p>
      <div className="spinner-border text-primary" role="status" />
    </div>
  )
}


// ── Profesor app ────────────────────────────────────────────────
function ProfesorApp({ onSignOut }: { onSignOut: () => void }) {
  const { user }    = useAuth()
  const { pagos }   = usePagos()
  const toastRef    = useRef<ToastHandle>(null)
  const contentRef  = useRef<HTMLDivElement>(null)
  const [page,           setPage]         = useState<PageId>('cal')
  const [modal,          setModal]         = useState<ModalState>({ type: 'none' })
  const [showMenu,       setShowMenu]      = useState(false)
  const [cobrosNewTrigger, setCobrosNew]   = useState(0)
  const [vistos, setVistos] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('avisos_vistos') ?? '[]')) }
    catch { return new Set() }
  })

  function toggleVisto(id: string) {
    setVistos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem('avisos_vistos', JSON.stringify([...next]))
      return next
    })
  }

  function limpiarVistos() {
    setVistos(new Set())
    localStorage.removeItem('avisos_vistos')
  }

  const toast = (msg: string) => toastRef.current?.show(msg)
  const _now = new Date().toISOString().split('T')[0]
  const _tom = (() => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0] })()
  const _curPeriodo = new Date().toISOString().substring(0, 7)
  const avisosCount = pagos.filter(p =>
    !p.fechaPago && (p.proximoPago < _now || p.proximoPago === _tom) &&
    !vistos.has(p.id) && p.periodo === _curPeriodo
  ).length

  const changePage = useCallback((id: string | null) => {
    if (!id) return
    setPage(id as PageId)
    contentRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  function openTurno(id: string | null, dia?: number, hora?: string, cancha?: number, fecha?: string) {
    setModal({ type: 'turno', editId: id, prefillDia: dia, prefillHora: hora, prefillCancha: cancha, prefillFecha: fecha })
  }
  function openAlumno(id: string | null) { setModal({ type: 'alumno', editId: id }) }
  function openGasto(id: string | null)  { setModal({ type: 'gasto',  editId: id }) }
  function closeModal()                  { setModal({ type: 'none' }) }

  function fabAction() {
    if (page === 'alumnos') openAlumno(null)
    else if (page === 'gastos') openGasto(null)
    else if (page === 'cobros') setCobrosNew(n => n + 1)
    else openTurno(null)
  }

  function renderPage() {
    switch (page) {
      case 'cal':      return <Calendario onOpenTurno={openTurno} onToast={toast} />
      case 'alumnos':  return <Alumnos    onOpenAlumno={openAlumno} />
      case 'gastos':   return <Gastos     onOpenGasto={openGasto} />
      case 'cobros':   return <Cobros onToast={toast} newTrigger={cobrosNewTrigger} onNewHandled={() => setCobrosNew(0)}
                          onPagoPaid={id => { if (vistos.has(id)) { setVistos(prev => { const n=new Set(prev); n.delete(id); localStorage.setItem('avisos_vistos',JSON.stringify([...n])); return n }) } }} />
      case 'avisos':   return <Avisos     onOpenAlumno={openAlumno} onToast={toast} vistos={vistos} onToggleVisto={toggleVisto} onLimpiarVistos={limpiarVistos} />
      case 'reportes': return <Reportes />
      case 'accesos':  return <Accesos    onToast={toast} />
    }
  }

  return (
    <div className="app-wrap">
      {/* Navbar */}
      <Navbar bg="primary" variant="dark" className="px-3 py-2 flex-shrink-0" style={{ boxShadow: '0 2px 8px rgba(0,0,0,.15)' }}>
        <Navbar.Brand className="fw-black me-auto" style={{ fontSize: 16, letterSpacing: -.3 }}>
          📅 TurnApp
        </Navbar.Brand>
        <div className="d-flex align-items-center gap-2">
          {!NO_FAB.includes(page) && (
            <Button variant="light" size="sm" className="fw-bold" onClick={fabAction}>+ Nuevo</Button>
          )}
          <button className="hdr-avatar" onClick={() => setShowMenu(true)}>
            {user?.photoURL
              ? <img src={user.photoURL} referrerPolicy="no-referrer" alt="" />
              : <span>{(user?.displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}</span>
            }
          </button>
        </div>
      </Navbar>

      {/* User menu — Modal */}
      <BSModal show={showMenu} onHide={() => setShowMenu(false)} centered size="sm">
        <BSModal.Body className="p-4">
          {/* Avatar */}
          <div className="text-center mb-3">
            <div
              className="rounded-circle overflow-hidden mx-auto mb-2 d-flex align-items-center justify-content-center fw-bold text-white"
              style={{ width: 72, height: 72, fontSize: 26, background: '#1A6BBF' }}
            >
              {user?.photoURL
                ? <img src={user.photoURL} referrerPolicy="no-referrer" alt="" width={72} height={72} style={{ objectFit: 'cover', display: 'block' }} />
                : (user?.displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()
              }
            </div>
            <div className="fw-bold fs-5 lh-sm">{user?.displayName}</div>
            <small className="text-muted">{user?.email}</small>
          </div>

          <hr className="my-3" />

          <div className="d-grid">
            <Button
              variant="outline-danger"
              size="lg"
              className="fw-semibold"
              onClick={() => { setShowMenu(false); onSignOut() }}
            >
              ↩︎ Cerrar sesión
            </Button>
          </div>
        </BSModal.Body>
      </BSModal>

      {/* Tabs */}
      <Nav variant="tabs" activeKey={page} onSelect={changePage} className="app-tabs">
        {TABS.map(t => (
          <Nav.Item key={t.id}>
            <Nav.Link eventKey={t.id} className="text-center position-relative" style={{ minWidth: 56 }}>
              <span className="tab-icon">{t.icon}</span>
              <span className="d-none d-md-inline">{t.label}</span>
              {t.id === 'avisos' && avisosCount > 0 && (
                <Badge bg="danger" pill className="position-absolute" style={{ top: 4, right: 4, fontSize: 9 }}>
                  {avisosCount}
                </Badge>
              )}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      {/* Content */}
      <div className="app-content" ref={contentRef}>
        <div className="p-3 pb-5">{renderPage()}</div>
      </div>

      {!NO_FAB.includes(page) && (
        <button className="fab d-md-none" onClick={fabAction} aria-label="Nuevo" />
      )}

      <TurnoModal
        open={modal.type === 'turno'}
        editId={modal.type === 'turno' ? modal.editId : null}
        prefillDia={modal.type === 'turno' ? modal.prefillDia : undefined}
        prefillHora={modal.type === 'turno' ? modal.prefillHora : undefined}
        prefillCancha={modal.type === 'turno' ? modal.prefillCancha : undefined}
        prefillFecha={modal.type === 'turno' ? modal.prefillFecha : undefined}
        onClose={closeModal} onToast={toast}
      />
      <AlumnoModal open={modal.type === 'alumno'} editId={modal.type === 'alumno' ? modal.editId : null} onClose={closeModal} onToast={toast} />
      <GastoModal  open={modal.type === 'gasto'}  editId={modal.type === 'gasto'  ? modal.editId : null} onClose={closeModal} onToast={toast} />
      <Toast ref={toastRef} />
    </div>
  )
}

// ── Sin acceso ──────────────────────────────────────────────────
function SinAccesoPage({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="role-screen">
      <div style={{ fontSize: 56 }} className="mb-3">🔒</div>
      <p className="fw-bold mb-1" style={{ fontSize: 22 }}>Acceso pendiente</p>
      <p className="text-muted text-center mb-4" style={{ maxWidth: 280, fontSize: 14 }}>
        Tu cuenta todavía no fue habilitada. Contactá al administrador para que te active el acceso.
      </p>
      <Button variant="outline-secondary" onClick={onSignOut}>Cerrar sesión</Button>
    </div>
  )
}

// ── Authenticated router ─────────────────────────────────────────
function AppRouter({ adminOverride, onClearOverride }: { adminOverride: boolean; onClearOverride: () => void }) {
  const { user, signOut }            = useAuth()
  const { state: { usuarios }, loading } = useStore()

  async function handleSignOut() { onClearOverride(); await signOut() }

  if (loading) return <LoadingScreen />

  // 7-tap override: primer setup sin necesitar activación
  if (adminOverride) return <ProfesorApp onSignOut={handleSignOut} />

  const myUser = usuarios.find(u => u.uid === user?.uid)

  if (!myUser?.activo) {
    return <SinAccesoPage onSignOut={handleSignOut} />
  }

  return <ProfesorApp onSignOut={handleSignOut} />
}

function AuthGate() {
  const { user, loading } = useAuth()
  const [adminOverride, setAdminOverride] = useState(false)

  if (loading) return <LoadingScreen />
  if (!user)   return <LoginScreen onAdminOverride={() => setAdminOverride(true)} />

  return (
    <StoreProvider>
      <AppRouter adminOverride={adminOverride} onClearOverride={() => setAdminOverride(false)} />
    </StoreProvider>
  )
}

export default function App() {
  return <AuthProvider><AuthGate /></AuthProvider>
}
