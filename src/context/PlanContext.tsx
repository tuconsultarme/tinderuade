import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useSesion } from './SesionContext'
import { MODO_DEMO } from '@/lib/demo'
import { capacidadesDe, comoPlan, type Capacidades, type Plan } from '@/lib/planes'

interface ValorPlan {
  plan: Plan
  capacidades: Capacidades
  /** Activa un plan (demo, sin pago). Persiste en la base y en localStorage. */
  activarPlan: (p: Plan) => Promise<void>
}

const Ctx = createContext<ValorPlan | null>(null)
const CLAVE = 'plan'

function planGuardado(): Plan {
  if (typeof localStorage === 'undefined') return 'gratis'
  return comoPlan(localStorage.getItem(CLAVE))
}

export function ProveedorPlan({ children }: { children: ReactNode }) {
  const { sesion } = useSesion()
  const miId = sesion?.user.id
  const [plan, setPlan] = useState<Plan>(planGuardado)

  // Al haber sesión, la fuente de verdad es la base. Si la columna todavía no
  // existe (migración 0013 sin aplicar), se queda con lo de localStorage.
  useEffect(() => {
    if (MODO_DEMO || !miId) return
    let vigente = true
    ;(async () => {
      const { data, error } = await supabase.from('profiles').select('plan').eq('id', miId).maybeSingle()
      if (!vigente || error || !data) return
      const p = comoPlan((data as { plan?: unknown }).plan)
      setPlan(p)
      localStorage.setItem(CLAVE, p)
    })()
    return () => {
      vigente = false
    }
  }, [miId])

  const activarPlan = useCallback(
    async (p: Plan) => {
      setPlan(p)
      localStorage.setItem(CLAVE, p)
      // Intenta persistir en la base; si la columna no está, queda solo local.
      if (!MODO_DEMO && miId) {
        await supabase.from('profiles').update({ plan: p }).eq('id', miId)
      }
    },
    [miId],
  )

  return (
    <Ctx.Provider value={{ plan, capacidades: capacidadesDe(plan), activarPlan }}>
      {children}
    </Ctx.Provider>
  )
}

export function usePlan(): ValorPlan {
  const v = useContext(Ctx)
  if (!v) throw new Error('usePlan tiene que usarse dentro de <ProveedorPlan>')
  return v
}
