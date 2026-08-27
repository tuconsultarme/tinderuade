import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { urlsFirmadas } from '@/lib/fotos'
import { TAMANO_TANDA, UMBRAL_RECARGA } from '@/lib/config'
import { comoPlan, type Plan } from '@/lib/planes'
import { MODO_DEMO, candidatosDemo, registrarLikeDemo, deshacerLikeDemo } from '@/lib/demo'
import type { Candidato, CandidatoConFotos, DireccionSwipe, Intencion } from '@/lib/tipos'

interface UltimoSwipe {
  candidato: CandidatoConFotos
  direccion: DireccionSwipe
  intencion: Intencion
}

interface Resultado {
  candidatos: CandidatoConFotos[]
  cargando: boolean
  error: string | null
  /** Registra el swipe y devuelve el id del match si se armó. */
  swipear: (candidato: CandidatoConFotos, direccion: DireccionSwipe) => Promise<string | null>
  /** True si hay un swipe reciente para deshacer (nunca después de un match). */
  hayParaDeshacer: boolean
  deshacer: () => Promise<void>
  recargar: () => void
}

/**
 * Trae candidatos para una intención y les resuelve las fotos.
 *
 * El feed se pide de a tandas y se recarga cuando quedan pocas cards sin
 * swipear, así el mazo nunca se queda vacío esperando la red en medio del uso.
 */
export function useMazo(modo: Intencion): Resultado {
  const [candidatos, setCandidatos] = useState<CandidatoConFotos[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // El único swipe que se puede deshacer es el último, y solo si no armó
  // match: desarmar un match ya mostrado es un caso raro que no vale la
  // complejidad (¿se borra también el match? ¿y si ya escribieron?).
  const [ultimoSwipe, setUltimoSwipe] = useState<UltimoSwipe | null>(null)

  // Evita que dos recargas se pisen y dupliquen candidatos en la lista.
  const trayendo = useRef(false)
  // Los ids ya vistos en esta sesión de mazo: get_candidatos filtra por swipes
  // registrados, pero una card en pantalla todavía no swipeada volvería a venir.
  const yaEnMazo = useRef<Set<string>>(new Set())
  // Quién estaba arriba cuando se movió el conmutador.
  const anteriorArriba = useRef<string | null>(null)

  const traer = useCallback(
    async (reemplazar: boolean) => {
      if (trayendo.current) return
      trayendo.current = true

      if (MODO_DEMO) {
        // Sin red: en demo el mazo sale de fixtures. Solo repone al reemplazar,
        // porque la lista de prueba es finita y si no se duplicaría sola.
        if (reemplazar) {
          const lista = candidatosDemo(modo)
          yaEnMazo.current = new Set(lista.map((c) => c.id))
          setCandidatos(lista)
        }
        setError(null)
        setCargando(false)
        trayendo.current = false
        return
      }

      const { data, error: errRpc } = await supabase.rpc('get_candidatos', {
        p_intencion: modo,
        p_limite: TAMANO_TANDA,
      })

      if (errRpc) {
        setError(errRpc.message)
        setCargando(false)
        trayendo.current = false
        return
      }

      const crudos = (data ?? []) as Candidato[]
      const nuevos = reemplazar ? crudos : crudos.filter((c) => !yaEnMazo.current.has(c.id))

      const conFotos = await resolverFotos(nuevos)

      if (reemplazar) {
        // Si la persona que estaba arriba también existe en esta lente, se
        // queda arriba. Eso es lo que hace que el conmutador se lea como
        // "la misma persona, mirada de otra manera" y no como un mazo nuevo.
        const preferido = anteriorArriba.current
        const ordenados =
          preferido && conFotos.some((c) => c.id === preferido)
            ? [
                conFotos.find((c) => c.id === preferido)!,
                ...conFotos.filter((c) => c.id !== preferido),
              ]
            : conFotos

        yaEnMazo.current = new Set(ordenados.map((c) => c.id))
        setCandidatos(ordenados)
      } else {
        for (const c of conFotos) yaEnMazo.current.add(c.id)
        setCandidatos((prev) => [...prev, ...conFotos])
      }

      setError(null)
      setCargando(false)
      trayendo.current = false
    },
    [modo],
  )

  // Va declarado antes del efecto de carga a propósito: cuando cambia `modo`
  // este no se dispara (la lista todavía no cambió), así que `anteriorArriba`
  // conserva a quien estaba en pantalla cuando se movió el conmutador.
  useEffect(() => {
    anteriorArriba.current = candidatos[0]?.id ?? null
  }, [candidatos])

  // Al cambiar de lente NO se vacía la lista: la card tiene que seguir montada
  // para que el Flip del conmutador tenga algo que recomponer. La reemplaza la
  // tanda nueva cuando llega.
  useEffect(() => {
    yaEnMazo.current = new Set()
    setUltimoSwipe(null)
    void traer(true)
  }, [traer])

  const swipear = useCallback(
    async (candidato: CandidatoConFotos, direccion: DireccionSwipe): Promise<string | null> => {
      const receptorId = candidato.id

      // Sale de la lista antes de que responda la red: el mazo tiene que
      // sentirse instantáneo. Si el insert falla se avisa, pero la card no
      // vuelve — get_candidatos la va a traer de nuevo en la próxima tanda.
      setCandidatos((prev) => prev.filter((c) => c.id !== receptorId))

      if (MODO_DEMO) {
        const matchId = direccion === 'like' ? registrarLikeDemo(receptorId, modo) : null
        setUltimoSwipe(matchId ? null : { candidato, direccion, intencion: modo })
        return matchId
      }

      const { data: sesion } = await supabase.auth.getUser()
      const yo = sesion.user?.id
      if (!yo) return null

      const { error: errSwipe } = await supabase.from('swipes').insert({
        emisor_id: yo,
        receptor_id: receptorId,
        direccion,
        intencion: modo,
      })

      if (errSwipe) {
        // 23505 = unique violation: ya había swipeado a esta persona en esta
        // intención. No es un error que valga la pena mostrar.
        if (errSwipe.code !== '23505') setError(errSwipe.message)
        return null
      }

      if (direccion !== 'like') {
        setUltimoSwipe({ candidato, direccion, intencion: modo })
        return null
      }

      // El match lo crea el trigger `crear_match_si_reciproco`. Acá solo se
      // consulta si quedó armado, con el par ordenado igual que en la tabla.
      const [a, b] = yo < receptorId ? [yo, receptorId] : [receptorId, yo]
      const { data: match } = await supabase
        .from('matches')
        .select('id')
        .eq('profile_a', a)
        .eq('profile_b', b)
        .eq('intencion', modo)
        .eq('activo', true)
        .maybeSingle()

      setUltimoSwipe(match ? null : { candidato, direccion, intencion: modo })
      return match?.id ?? null
    },
    [modo],
  )

  const deshacer = useCallback(async () => {
    if (!ultimoSwipe) return
    const { candidato, direccion, intencion } = ultimoSwipe
    setUltimoSwipe(null)

    if (MODO_DEMO) {
      if (direccion === 'like') deshacerLikeDemo()
      yaEnMazo.current.add(candidato.id)
      setCandidatos((prev) => [candidato, ...prev])
      return
    }

    const { data: sesion } = await supabase.auth.getUser()
    const yo = sesion.user?.id
    if (!yo) return

    const { error: errBorrar } = await supabase
      .from('swipes')
      .delete()
      .eq('emisor_id', yo)
      .eq('receptor_id', candidato.id)
      .eq('intencion', intencion)

    if (errBorrar) {
      setError(errBorrar.message)
      return
    }

    yaEnMazo.current.add(candidato.id)
    setCandidatos((prev) => [candidato, ...prev])
  }, [ultimoSwipe])

  // Reponer cuando la pila se está por acabar.
  useEffect(() => {
    if (!cargando && candidatos.length > 0 && candidatos.length <= UMBRAL_RECARGA) {
      void traer(false)
    }
  }, [candidatos.length, cargando, traer])

  return {
    candidatos,
    cargando,
    error,
    swipear,
    hayParaDeshacer: ultimoSwipe !== null,
    deshacer,
    recargar: () => void traer(true),
  }
}

/** Une cada candidato con sus fotos ya firmadas, en una sola tanda de requests. */
async function resolverFotos(candidatos: Candidato[]): Promise<CandidatoConFotos[]> {
  if (candidatos.length === 0) return []

  const { data: filas } = await supabase
    .from('fotos')
    .select('profile_id, storage_path, orden')
    .in(
      'profile_id',
      candidatos.map((c) => c.id),
    )
    .order('orden', { ascending: true })

  const porPerfil = new Map<string, string[]>()
  for (const f of filas ?? []) {
    const lista = porPerfil.get(f.profile_id) ?? []
    lista.push(f.storage_path)
    porPerfil.set(f.profile_id, lista)
  }

  const todos = [...porPerfil.values()].flat()
  const [firmadas, planPorId] = await Promise.all([
    urlsFirmadas(todos),
    planesDe(candidatos.map((c) => c.id)),
  ])

  return candidatos.map((c) => ({
    ...c,
    fotos: (porPerfil.get(c.id) ?? [])
      .map((p) => firmadas.get(p))
      .filter((u): u is string => Boolean(u)),
    plan: planPorId.get(c.id) ?? 'gratis',
  }))
}

/** Trae el plan de cada perfil. Tolerante: si falta la columna (migración
 *  0013 sin aplicar), devuelve el mapa vacío y todos quedan en 'gratis'. */
async function planesDe(ids: string[]): Promise<Map<string, Plan>> {
  const mapa = new Map<string, Plan>()
  if (ids.length === 0) return mapa
  const { data, error } = await supabase.from('profiles').select('id, plan').in('id', ids)
  if (error || !data) return mapa
  for (const p of data as { id: string; plan?: unknown }[]) mapa.set(p.id, comoPlan(p.plan))
  return mapa
}
