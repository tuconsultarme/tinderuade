import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { MODO_DEMO, MI_ID_DEMO, PERFIL_DEMO } from '@/lib/demo'
import type { Perfil } from '@/lib/tipos'

/**
 * Sesión falsa para el modo demo. Se arma acá, en un solo lugar, para que todo
 * lo que lee `sesion.user.id` río abajo siga funcionando sin ramas propias.
 */
const SESION_DEMO = {
  user: { id: MI_ID_DEMO, email: 'demo@uadencuentros.local' },
} as unknown as Session

interface ValorSesion {
  sesion: Session | null
  perfil: Perfil | null
  /** True mientras no sabemos todavía si hay sesión. Evita parpadeos de rutas. */
  cargando: boolean
  refrescarPerfil: () => Promise<void>
  salir: () => Promise<void>
}

const Ctx = createContext<ValorSesion | null>(null)

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(MODO_DEMO ? SESION_DEMO : null)
  const [perfil, setPerfil] = useState<Perfil | null>(MODO_DEMO ? PERFIL_DEMO : null)
  const [cargando, setCargando] = useState(!MODO_DEMO)

  const traerPerfil = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    // maybeSingle y no single: recién registrado todavía no tiene fila de
    // perfil, y eso no es un error — es el estado que dispara el onboarding.
    if (error) {
      console.error('No se pudo traer el perfil:', error.message)
      setPerfil(null)
      return
    }
    setPerfil((data as Perfil) ?? null)
  }, [])

  useEffect(() => {
    // En demo no hay nada que consultar: la sesión ya vino armada del estado
    // inicial y no hay que suscribirse a los cambios de auth.
    if (MODO_DEMO) return

    let vigente = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!vigente) return
      setSesion(data.session)
      if (data.session) await traerPerfil(data.session.user.id)
      if (vigente) setCargando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evento, nuevaSesion) => {
      if (!vigente) return
      setSesion(nuevaSesion)
      if (nuevaSesion) {
        await traerPerfil(nuevaSesion.user.id)
      } else {
        setPerfil(null)
      }
      setCargando(false)
    })

    return () => {
      vigente = false
      sub.subscription.unsubscribe()
    }
  }, [traerPerfil])

  const refrescarPerfil = useCallback(async () => {
    if (sesion) await traerPerfil(sesion.user.id)
  }, [sesion, traerPerfil])

  const salir = useCallback(async () => {
    await supabase.auth.signOut()
    setPerfil(null)
  }, [])

  return (
    <Ctx.Provider value={{ sesion, perfil, cargando, refrescarPerfil, salir }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSesion(): ValorSesion {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSesion tiene que usarse dentro de <ProveedorSesion>')
  return v
}
