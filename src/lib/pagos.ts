import { useState, useEffect } from 'react'
import { collection, doc, setDoc, updateDoc, deleteDoc, getDocs, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { genId } from './utils'

const TODAY = new Date().toISOString().split('T')[0]

export interface PagoRecord {
  id:          string
  alumnoId:    string
  monto:       number
  proximoPago: string    // YYYY-MM-DD
  fechaPago?:  string    // YYYY-MM-DD
  usuarioId?:  string
  periodo?:    string    // YYYY-MM  (ej: "2026-05" = Mayo 2026)
  ts:          number
}

export type PagoEstado = 'pagado' | 'pendiente' | 'vencido'

export function getPagoEstado(p: Pick<PagoRecord, 'fechaPago' | 'proximoPago'>): PagoEstado {
  if (p.fechaPago)           return 'pagado'
  if (p.proximoPago < TODAY) return 'vencido'
  return 'pendiente'
}

// Suma 1 mes a una fecha YYYY-MM-DD
export function addMonth(date: string): string {
  const d = new Date(date + 'T12:00:00')
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

export function usePagos() {
  const [pagos,   setPagos]   = useState<PagoRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'pagos'), snap => {
      setPagos(snap.docs.map(d => d.data() as PagoRecord))
      setLoading(false)
    })
    return unsub
  }, [])

  async function createPago(data: Omit<PagoRecord, 'id' | 'ts'>) {
    const id      = genId()
    const payload = { ...data, id, ts: Date.now() } as Record<string, unknown>
    // Firestore rechaza undefined — limpiar antes de escribir
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k])
    await setDoc(doc(db, 'pagos', id), payload)
    return id
  }

  async function updatePago(id: string, data: Partial<Omit<PagoRecord, 'id' | 'ts'>>) {
    const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
    await updateDoc(doc(db, 'pagos', id), clean)
  }

  async function deletePago(id: string) {
    await deleteDoc(doc(db, 'pagos', id))
  }

  async function deleteAll() {
    const snap = await getDocs(collection(db, 'pagos'))
    for (const d of snap.docs) await deleteDoc(d.ref)
  }

  // Marca como pagado y crea el siguiente período pendiente
  async function marcarPagado(pago: PagoRecord, fechaPago: string, usuarioId: string) {
    await updatePago(pago.id, { fechaPago, usuarioId: usuarioId || undefined })
    const nextProximo = addMonth(pago.proximoPago)
    await createPago({
      alumnoId:    pago.alumnoId,
      monto:       pago.monto,
      proximoPago: nextProximo,
      periodo:     nextProximo.substring(0, 7),   // auto-asignar período del siguiente mes
    })
  }

  return { pagos, loading, createPago, updatePago, deletePago, deleteAll, marcarPagado }
}
