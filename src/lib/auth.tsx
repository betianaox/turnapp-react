import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from './firebase'

interface AuthCtx {
  user: User | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

async function syncUser(u: User) {
  const ref  = doc(db, 'usuarios', u.uid)
  const snap = await getDoc(ref)
  const today = new Date().toISOString().split('T')[0]

  if (!snap.exists()) {
    await setDoc(ref, {
      uid:         u.uid,
      email:       u.email       ?? '',
      displayName: u.displayName ?? '',
      photoURL:    u.photoURL    ?? null,
      activo:      false,
      rol:         'profe',
      primerLogin: today,
      ultimoLogin: today,
    })
  } else {
    await updateDoc(ref, {
      email:       u.email       ?? '',
      displayName: u.displayName ?? '',
      photoURL:    u.photoURL    ?? null,
      ultimoLogin: today,
    })
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (u) await syncUser(u).catch(console.error)
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  async function signIn()  { await signInWithPopup(auth, googleProvider) }
  async function signOut() { await fbSignOut(auth) }

  return (
    <Ctx.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth requires AuthProvider')
  return ctx
}
