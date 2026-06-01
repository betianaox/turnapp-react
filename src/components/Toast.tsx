import { forwardRef, useImperativeHandle, useRef, useEffect } from 'react'

export interface ToastHandle {
  show: (msg: string) => void
}

export const Toast = forwardRef<ToastHandle>((_, ref) => {
  const elRef    = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useImperativeHandle(ref, () => ({
    show(msg: string) {
      const el = elRef.current
      if (!el) return
      el.textContent = msg
      el.style.opacity = '1'
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => { if (elRef.current) elRef.current.style.opacity = '0' }, 2200)
    },
  }))

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return <div ref={elRef} className="app-toast" style={{ opacity: 0 }} />
})
Toast.displayName = 'Toast'
