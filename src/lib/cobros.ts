import { useState, useEffect } from 'react'
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import type { Turno } from '../types'
import type { PreciosConfig } from './config'

// ── Registro de cobro por alumno ────────────────────────────────
export interface CobroRecord {
  alumnoId:          string
  fechaPago?:        string   // último pago registrado (YYYY-MM-DD)
  clasesOverride?:   number
  tipoOverride?:     string
  fechaProximoPago?: string   // override manual de la fecha calculada
}

// ── Resultado del cálculo de cobro ──────────────────────────────
export interface CobroCalc {
  monto:     number
  clases:    number
  tipoLabel: string
}

export function calcCobro(
  alumnoId: string,
  turnos:   Turno[],
  precios:  PreciosConfig,
): CobroCalc {
  const mine = turnos.filter(t => t.alumnoIds.includes(alumnoId) && t.fijo === true)
  const grupales     = mine.filter(t => t.tipo === 'grupal').length
  const individuales = mine.filter(t => t.tipo === 'individual').length
  let monto = 0; const partes: string[] = []; let clases = 0

  if      (grupales === 1) { monto += precios.grupalMensual;     partes.push('Grupal mensual');       clases += 4  }
  else if (grupales === 2) { monto += precios.grupalDoble;       partes.push('Grupal doble');         clases += 8  }
  else if (grupales >= 3)  { monto += precios.grupalTriple;      partes.push('Grupal triple');        clases += 12 }

  if (individuales === 1)  { monto += precios.individualMensual; partes.push('Individual mensual');   clases += 4  }
  else if (individuales > 1) {
    monto  += precios.individualMensual * individuales
    partes.push(`Individual mensual ×${individuales}`)
    clases += 4 * individuales
  }
  return { monto, clases, tipoLabel: partes.join(' + ') || '—' }
}

// ── Calcula próximo pago contando clases reales del calendario ──
// Desde fechaPago (inclusive si es día de clase), cuenta `clases`
// ocurrencias de días que el alumno tiene turno, y devuelve la fecha
// de la siguiente clase después de esas N.
export function calcNextPayment(
  fechaPago: string,
  alumnoId:  string,
  turnos:    Turno[],
  clases:    number,
): string {
  if (!fechaPago || clases <= 0) return ''

  const classDays = new Set(
    turnos
      .filter(t => t.alumnoIds.includes(alumnoId) && t.fijo === true)
      .map(t => t.dia)   // 1=Lun … 6=Sáb (coincide con JS getDay() para 1-6)
  )
  if (!classDays.size) return ''

  const isClass = (d: Date) => {
    const dow = d.getDay()
    return dow >= 1 && classDays.has(dow)
  }

  const d = new Date(fechaPago + 'T12:00:00')
  let counted = 0

  // Contar N clases desde fechaPago (inclusive)
  while (counted < clases) {
    if (isClass(d)) counted++
    if (counted < clases) d.setDate(d.getDate() + 1)
  }

  // Avanzar hasta el siguiente día de clase
  d.setDate(d.getDate() + 1)
  let limit = 0
  while (!isClass(d) && limit++ < 14) d.setDate(d.getDate() + 1)

  return d.toISOString().split('T')[0]
}

// ── Hook ─────────────────────────────────────────────────────────
export function useCobros() {
  const [cobros, setCobros] = useState<Record<string, CobroRecord>>({})

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'cobros'), snap => {
      const map: Record<string, CobroRecord> = {}
      snap.docs.forEach(d => { map[d.id] = d.data() as CobroRecord })
      setCobros(map)
    })
    return unsub
  }, [])

  async function saveCobro(record: CobroRecord) {
    await setDoc(doc(db, 'cobros', record.alumnoId), record)
  }

  return { cobros, saveCobro }
}
