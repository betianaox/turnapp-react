export const PRECIOS: Record<string, number> = {
  grupal: 75000,
  individual: 100000,
  '2x': 110000,
  '3x': 150000,
  clase: 25000,
}

export const CLASES_MAX: Record<string, number> = {
  grupal: 4,
  individual: 4,
  '2x': 8,
  '3x': 12,
  clase: 1,
}

export const TIPO_LBL: Record<string, string> = {
  grupal: 'Grupal',
  individual: 'Individual',
  '2x': '2x/sem',
  '3x': '3x/sem',
  clase: 'Clase suelta',
}


export const DAYS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export const HOURS: string[] = []
for (let h = 7; h <= 17; h++) {
  HOURS.push(`${String(h).padStart(2, '0')}:00`)
  HOURS.push(`${String(h).padStart(2, '0')}:30`)
}
HOURS.push('18:00')
