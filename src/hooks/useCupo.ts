import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MODO_DEMO, cupoDemo, consumirLikeDemo } from '@/lib/demo'

export interface Cupo {
  usados: number
  restantes: number
  ilimitado: boolean
}

/** SQLSTATE propio del trigger `swipes_cupo_de_likes` (migración 0011). */
export const CODIGO_SIN_CUPO = 'U0025'

/**
 * Cupo diario de likes del plan gratuito.
 *
 * El número que manda es el de la base: acá solo se lee para mostrarlo y para
 * frenar el botón antes de pegarle al servidor. Si por lo que sea el contador
 * quedara desfasado, el trigger igual rechaza el insert.
 */
export function useCupo() {
  const [cupo, setCupo] = useState<Cupo | null>(null)

  const refrescar = useCallback(async () => {
    if (MODO_DEMO) {
      setCupo(cupoDemo())
      return
    }
    const { data, error } = await supabase.rpc('mi_cupo_de_likes')
    // Si la migración 0011 todavía no se aplicó, la función no existe: se
    // trata como ilimitado para no romper el mazo.
    if (error || !data?.[0]) {
      setCupo({ usados: 0, restantes: Infinity, ilimitado: true })
      return
    }
    setCupo(data[0] as Cupo)
  }, [])

  useEffect(() => {
    void refrescar()
  }, [refrescar])

  /** Descuenta uno de forma optimista, para que el contador no espere la red. */
  const consumir = useCallback(() => {
    if (MODO_DEMO) consumirLikeDemo()
    setCupo((prev) =>
      prev && !prev.ilimitado
        ? { ...prev, usados: prev.usados + 1, restantes: Math.max(0, prev.restantes - 1) }
        : prev,
    )
  }, [])

  const sinCupo = Boolean(cupo && !cupo.ilimitado && cupo.restantes <= 0)

  return { cupo, sinCupo, consumir, refrescar }
}
