import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  collection, doc, onSnapshot,
  setDoc, deleteDoc, updateDoc,
  query, where, getDocs,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Alumno, Turno, Gasto, Usuario } from '../types'
import { genId } from './utils'

// ── State ───────────────────────────────────────────────────────
interface AppState {
  alumnos:  Alumno[]
  turnos:   Turno[]
  gastos:   Gasto[]
  usuarios: Usuario[]
}

interface StoreCtx {
  state:   AppState
  loading: boolean
  saveAlumno:        (a: Omit<Alumno, 'id'> & { id?: string }) => Promise<string>
  deleteAlumno:      (id: string) => Promise<void>
  saveTurno:         (t: Omit<Turno, 'id' | 'ts'> & { id?: string }) => Promise<string>
  deleteTurno:       (id: string) => Promise<void>
  saveGasto:         (g: Omit<Gasto, 'id' | 'ts'> & { id?: string }) => Promise<string>
  deleteGasto:       (id: string) => Promise<void>
  setUsuarioActivo:  (uid: string, activo: boolean) => Promise<void>
  setUsuarioRol:     (uid: string, rol: 'dev' | 'profe') => Promise<void>
  deleteUsuario:     (uid: string) => Promise<void>
  addExcepcion:      (turnoId: string, fecha: string) => Promise<void>
}

const Ctx = createContext<StoreCtx | null>(null)

// ── Provider ────────────────────────────────────────────────────
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState]     = useState<AppState>({ alumnos: [], turnos: [], gastos: [], usuarios: [] })
  const [loading, setLoading] = useState(true)
  const ready = useRef({ alumnos: false, turnos: false, gastos: false, usuarios: false })

  function tick(col: keyof typeof ready.current) {
    ready.current[col] = true
    if (Object.values(ready.current).every(Boolean)) setLoading(false)
  }

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, 'alumnos'), snap => {
        setState(s => ({ ...s, alumnos: snap.docs.map(d => d.data() as Alumno) }))
        tick('alumnos')
      }),
      onSnapshot(collection(db, 'turnos'), snap => {
        setState(s => ({
          ...s,
          turnos: snap.docs.map(d => ({ ...d.data(), alumnoIds: (d.data().alumnoIds ?? []) as string[] }) as Turno),
        }))
        tick('turnos')
      }),
      onSnapshot(collection(db, 'gastos'), snap => {
        setState(s => ({ ...s, gastos: snap.docs.map(d => d.data() as Gasto) }))
        tick('gastos')
      }),
      onSnapshot(collection(db, 'usuarios'), snap => {
        setState(s => ({ ...s, usuarios: snap.docs.map(d => d.data() as Usuario) }))
        tick('usuarios')
      }),
    ]
    return () => unsubs.forEach(u => u())
  }, [])

  // ── Alumnos ──────────────────────────────────────────────────
  async function saveAlumno(data: Omit<Alumno, 'id'> & { id?: string }) {
    const id = data.id || genId()
    await setDoc(doc(db, 'alumnos', id), { ...data, id })
    return id
  }

  async function deleteAlumno(id: string) {
    await deleteDoc(doc(db, 'alumnos', id))
    const snap = await getDocs(
      query(collection(db, 'turnos'), where('alumnoIds', 'array-contains', id))
    )
    for (const d of snap.docs) {
      const newIds = (d.data().alumnoIds as string[]).filter(aid => aid !== id)
      if (newIds.length === 0) await deleteDoc(d.ref)
      else await updateDoc(d.ref, { alumnoIds: newIds })
    }
  }

  // ── Turnos ───────────────────────────────────────────────────
  async function saveTurno(data: Omit<Turno, 'id' | 'ts'> & { id?: string }) {
    const id = data.id || genId()
    const payload = { ...data, id, ts: Date.now() }
    // Firestore no acepta undefined — eliminar campos antes de escribir
    Object.keys(payload).forEach(k => (payload as Record<string, unknown>)[k] === undefined && delete (payload as Record<string, unknown>)[k])
    await setDoc(doc(db, 'turnos', id), payload)
    return id
  }

  async function deleteTurno(id: string) {
    await deleteDoc(doc(db, 'turnos', id))
  }

  // ── Gastos ───────────────────────────────────────────────────
  async function saveGasto(data: Omit<Gasto, 'id' | 'ts'> & { id?: string }) {
    const id = data.id || genId()
    await setDoc(doc(db, 'gastos', id), { ...data, id, ts: Date.now() })
    return id
  }

  async function deleteGasto(id: string) {
    await deleteDoc(doc(db, 'gastos', id))
  }

  // ── Usuarios ─────────────────────────────────────────────────
  async function addExcepcion(turnoId: string, fecha: string) {
    const turno = state.turnos.find(t => t.id === turnoId)
    const prev = turno?.excepciones ?? []
    if (prev.includes(fecha)) return
    await updateDoc(doc(db, 'turnos', turnoId), { excepciones: [...prev, fecha] })
  }

  async function setUsuarioActivo(uid: string, activo: boolean) {
    await updateDoc(doc(db, 'usuarios', uid), { activo })
  }

  async function setUsuarioRol(uid: string, rol: 'dev' | 'profe') {
    await updateDoc(doc(db, 'usuarios', uid), { rol })
  }

  async function deleteUsuario(uid: string) {
    await deleteDoc(doc(db, 'usuarios', uid))
  }

  return (
    <Ctx.Provider value={{
      state, loading,
      saveAlumno,    deleteAlumno,
      saveTurno,     deleteTurno,
      saveGasto,     deleteGasto,
      setUsuarioActivo, setUsuarioRol, deleteUsuario, addExcepcion,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore requires StoreProvider')
  return ctx
}
