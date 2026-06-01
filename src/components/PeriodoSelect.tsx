import Form from 'react-bootstrap/Form'
import { periodoLabel } from '../lib/utils'

function generateOptions(back = 24, forward = 3) {
  const opts: { value: string; label: string }[] = []
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - back, 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + forward, 1)
  const d     = new Date(start)
  while (d <= end) {
    const y = d.getFullYear()
    const m = d.getMonth()
    const value = `${y}-${String(m + 1).padStart(2, '0')}`
    opts.push({ value, label: periodoLabel(value) })
    d.setMonth(d.getMonth() + 1)
  }
  return opts.reverse()
}

interface Props {
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
  size?:        'sm' | undefined
  style?:       React.CSSProperties
  className?:   string
  back?:        number
  forward?:     number
}

export function PeriodoSelect({
  value, onChange,
  placeholder = '— Período —',
  size, style, className,
  back = 24, forward = 3,
}: Props) {
  const options = generateOptions(back, forward)
  return (
    <Form.Select
      size={size}
      style={style}
      className={className}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Form.Select>
  )
}
