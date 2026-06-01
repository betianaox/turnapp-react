export type TipoClase  = 'grupal' | 'individual' | '2x' | '3x' | 'clase' | 'bloqueo'
export type EstadoPago = 'pagado' | 'pendiente'
export type CatGasto   = 'cancha' | 'bar' | 'otro'
export type PageId     = 'cal' | 'alumnos' | 'gastos' | 'cobros' | 'avisos' | 'reportes' | 'accesos'

export type RolUsuario = 'profe' | 'dev'

export interface Usuario {
  uid:         string
  email:       string
  displayName: string
  photoURL:    string | null
  activo:      boolean
  rol:         RolUsuario   // 'profe' participa en asignaciones; 'dev' no se asigna a sí mismo
  primerLogin: string
  ultimoLogin: string
}

export interface Alumno {
  id: string
  nombre: string
  tel: string
  email: string
  tipo: TipoClase
  clases: number
  inicio: string
  pago: EstadoPago
  notas: string
}

export interface Turno {
  id: string
  alumnoIds: string[]
  dia: number
  hora: string
  cancha: number
  tipo: TipoClase
  fijo: boolean
  excepciones: string[]
  fecha?: string
  pago: EstadoPago
  notas: string
  ts: number
}

export interface Gasto {
  id: string
  desc: string
  monto: number
  cat: CatGasto
  fecha: string
  usuarioId: string
  periodo?: string    // YYYY-MM  (ej: "2026-05" = Mayo 2026)
  notas: string
  ts: number
}

export interface Acceso {
  email: string
  fechaAgregado: string
  agregadoPor: string
}
