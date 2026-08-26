import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Intencion } from '@/lib/tipos'

const CLAVE = 'uadencuentros:modo'

interface ValorModo {
  modo: Intencion
  setModo: (m: Intencion) => void
}

const Ctx = createContext<ValorModo | null>(null)

/**
 * El modo activo vive acá arriba y no en la pantalla del mazo porque tiñe la
 * app entera: el atributo data-modo en <html> es lo que cambia --acento, y de
 * ahí lo leen el conmutador, los botones, el chat y el overlay de match.
 */
export function ProveedorModo({ children }: { children: ReactNode }) {
  const [modo, setModoEstado] = useState<Intencion>(() => {
    const guardado = localStorage.getItem(CLAVE)
    return guardado === 'match' || guardado === 'estudio'
      ? guardado
      : 'match'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-modo', modo)
    localStorage.setItem(CLAVE, modo)
  }, [modo])

  return <Ctx.Provider value={{ modo, setModo: setModoEstado }}>{children}</Ctx.Provider>
}

export function useModo(): ValorModo {
  const v = useContext(Ctx)
  if (!v) throw new Error('useModo tiene que usarse dentro de <ProveedorModo>')
  return v
}
