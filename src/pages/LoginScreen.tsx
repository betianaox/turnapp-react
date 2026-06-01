import { useRef, useState } from 'react'
import Button from 'react-bootstrap/Button'
import { useAuth } from '../lib/auth'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 13.795 17.64 11.487 17.64 9.2z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

interface Props { onAdminOverride: () => void }

export function LoginScreen({ onAdminOverride }: Props) {
  const { signIn } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleLogoTap() {
    tapCount.current += 1
    if (tapTimer.current) clearTimeout(tapTimer.current)
    if (tapCount.current >= 7) { tapCount.current = 0; onAdminOverride(); return }
    tapTimer.current = setTimeout(() => { tapCount.current = 0 }, 3000)
  }

  async function handleSignIn() {
    setLoading(true); setError(null)
    try {
      await signIn()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      if (!msg.includes('popup-closed') && !msg.includes('cancelled'))
        setError('No se pudo iniciar sesión. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="role-screen">
      <button className="role-logo-btn" onClick={handleLogoTap} tabIndex={-1}>📅</button>
      <p className="fw-black mb-4" style={{ fontSize: 30, letterSpacing: -1 }}>TurnApp</p>

      <Button
        variant="light"
        className="d-flex align-items-center gap-2 shadow-sm border fw-semibold px-4 py-2"
        style={{ width: '100%', maxWidth: 320, borderRadius: 12 }}
        onClick={handleSignIn}
        disabled={loading}
      >
        {loading
          ? <span className="spinner-border spinner-border-sm text-primary" />
          : <GoogleIcon />
        }
        {loading ? 'Entrando...' : 'Continuar con Google'}
      </Button>

      {error && <p className="text-danger small mt-3">{error}</p>}
    </div>
  )
}
