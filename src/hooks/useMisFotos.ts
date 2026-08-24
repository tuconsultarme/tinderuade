import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { urlsFirmadas } from '@/lib/fotos'
import { MODO_DEMO } from '@/lib/demo'
import type { Foto } from '@/lib/tipos'

export function useMisFotos(userId: string | undefined) {
  const [fotos, setFotos] = useState<Foto[]>([])
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  const [cargando, setCargando] = useState(true)

  const refrescar = useCallback(async () => {
    // En demo no hay bucket ni token, y urlsFirmadas tiraría por falta de
    // sesión. Se devuelve vacío y el gestor muestra el estado sin fotos.
    if (MODO_DEMO || !userId) {
      setFotos([])
      setUrls(new Map())
      setCargando(false)
      return
    }

    const { data } = await supabase
      .from('fotos')
      .select('id, profile_id, storage_path, orden')
      .eq('profile_id', userId)
      .order('orden', { ascending: true })

    const lista = (data as Foto[]) ?? []
    setFotos(lista)
    setUrls(await urlsFirmadas(lista.map((f) => f.storage_path)))
    setCargando(false)
  }, [userId])

  useEffect(() => {
    void refrescar()
  }, [refrescar])

  return { fotos, urls, cargando, refrescar }
}
