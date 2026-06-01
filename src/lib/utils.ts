import { MONTHS } from '../constants'
import type { Alumno, Turno } from '../types'

export function toTitleCase(s: string): string {
  return s.trim().replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}


const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export function periodoLabel(p?: string): string {
  if (!p) return '—'
  const [y, m] = p.split('-')
  return `${MESES_ES[parseInt(m) - 1]} ${y}`
}

export function fp(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

export function ff(s: string): string {
  if (!s) return ''
  const p = String(s).substring(0, 10).split('-')
  return `${p[2]}/${p[1]}/${p[0]}`
}

export function genId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 12)
}

export function getWeekDates(off: number): Date[] {
  const t = new Date()
  const dow = t.getDay() || 7
  const mon = new Date(t)
  mon.setDate(t.getDate() - dow + 1 + off * 7)
  const res: Date[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    res.push(d)
  }
  return res
}

export function isToday(d: Date): boolean {
  return d.toDateString() === new Date().toDateString()
}

export function getTurnoColor(t: Turno, alumnos: Alumno[]): string {
  if (t.tipo === 'bloqueo') return 'blk-e'
  let worst = 0
  t.alumnoIds.forEach(aid => {
    const a = alumnos.find(x => x.id === aid)
    if (a) {
      if (a.clases === 0 && worst < 2) worst = 2
      else if (a.clases === 1 && worst < 1) worst = 1
    }
  })
  if (worst === 2) return 'blk-e'
  if (worst === 1) return 'blk-w'
  const map: Record<string, string> = {
    grupal: 'blk-g', individual: 'blk-i', '2x': 'blk-2x', '3x': 'blk-3x', clase: 'blk-x1',
  }
  return map[t.tipo] ?? 'blk-g'
}

export function todayKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  return `${MONTHS[parseInt(m) - 1]} ${y}`
}
