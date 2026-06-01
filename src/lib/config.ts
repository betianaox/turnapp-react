import { useState, useEffect } from 'react'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'

export interface PreciosConfig {
  sinCargo:          number  // 0
  individual:        number  // 25000 — por clase suelta
  grupalMensual:     number  // 75000 — x4 clases
  individualMensual: number  // 100000 — x4 clases
  grupalPorClase:    number  // 20000 — grupal por clase suelta
  grupalDoble:       number  // 110000 — x8 clases
  grupalTriple:      number  // 150000 — x12 clases
  individualCustom:  number  // configurable por alumno (default)
}

export const DEFAULT_PRECIOS: PreciosConfig = {
  sinCargo:          0,
  individual:        25000,
  grupalMensual:     75000,
  individualMensual: 100000,
  grupalPorClase:    20000,
  grupalDoble:       110000,
  grupalTriple:      150000,
  individualCustom:  0,
}

// Clases que corresponden a cada tipo (para calcular precio por clase)
export const CLASES_POR_TIPO: Partial<Record<keyof PreciosConfig, number>> = {
  grupalMensual:     4,
  individualMensual: 4,
  grupalDoble:       8,
  grupalTriple:      12,
}

const CONFIG_REF = () => doc(db, 'config', 'precios')

export function usePrecios() {
  const [precios, setPrecios] = useState<PreciosConfig>(DEFAULT_PRECIOS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(CONFIG_REF(), snap => {
      setPrecios(snap.exists() ? { ...DEFAULT_PRECIOS, ...snap.data() } : DEFAULT_PRECIOS)
      setLoading(false)
    })
    return unsub
  }, [])

  async function savePrecios(p: PreciosConfig) {
    await setDoc(CONFIG_REF(), p)
  }

  return { precios, loading, savePrecios }
}
