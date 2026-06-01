import { useRef } from 'react'
import Form from 'react-bootstrap/Form'

function toDisplay(v: string): string {
  if (!v || v.length < 10) return ''
  return `${v.substring(8, 10)}/${v.substring(5, 7)}/${v.substring(0, 4)}`
}

interface Props {
  value:        string
  onChange:     (v: string) => void
  disabled?:    boolean
  placeholder?: string
  size?:        'sm' | undefined
}

export function DateFieldES({ value, onChange, disabled, placeholder = 'dd/mm/aaaa', size }: Props) {
  const hiddenRef = useRef<HTMLInputElement>(null)

  function handleClick() {
    if (disabled) return
    const input = hiddenRef.current
    if (!input) return
    // showPicker debe llamarse dentro de un evento de usuario
    try {
      input.showPicker()
    } catch {
      input.focus()
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Campo visible con DD/MM/AAAA */}
      <Form.Control
        size={size}
        readOnly
        disabled={disabled}
        value={toDisplay(value)}
        placeholder={placeholder}
        onClick={handleClick}
        style={{ cursor: disabled ? 'default' : 'pointer' }}
      />
      {/* Input de fecha oculto — sólo para abrir el picker */}
      <input
        ref={hiddenRef}
        type="date"
        lang="es-AR"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: 0,
          height: 0,
          padding: 0,
          border: 0,
          top: 0,
          left: 0,
        }}
        tabIndex={-1}
      />
    </div>
  )
}
