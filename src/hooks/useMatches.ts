import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { urlsFirmadas } from '@/lib/fotos'
import { MODO_DEMO, matchesConPerfilDemo } from '@/lib/demo'
import type { Match, MatchConPerfil, Mensaje } from '@/lib/tipos'

/**
 * Lista de matches con el perfil del otro, el último mensaje y los sin leer.
 *
 * Se suscribe a Realtime para que un mensaje nuevo mueva el match al tope y
 * actualice el contador sin que haya que volver a entrar a la pantalla.
 */
export function useMatches(miId: string | undefined) {
  const [matches, setMatches] = useState<MatchConPerfil[]>([])
  const [cargando, setCargando] = useState(true)

  // Nombre único por montaje: <Mazo> y <Matches>/<MiPerfil> llaman a este hook
  // por separado, así que al navegar entre tabs se desmonta uno y se monta el
  // otro casi en simultáneo. El desmonte limpia el canal de forma asíncrona, y
  // si el nuevo canal se creara con el mismo nombre, Supabase reutiliza el que
  // ya estaba suscripto en vez de crear uno nuevo y explota al intentar
  // agregarle callbacks. Un nombre distinto por instancia lo evita del todo.
  const idCanal = useRef(`matches-y-mensajes-${crypto.randomUUID()}`)

  const cargar = useCallback(async () => {
    if (MODO_DEMO) {
      setMatches(matchesConPerfilDemo())
      setCargando(false)
      return
    }

    if (!miId) {
      setMatches([])
      setCargando(false)
      return
    }

    const { data: filas } = await supabase
      .from('matches')
      .select('id, profile_a, profile_b, intencion, activo, created_at')
      .eq('activo', true)
      .order('created_at', { ascending: false })

    const propios = (filas as Match[]) ?? []
    if (propios.length === 0) {
      setMatches([])
      setCargando(false)
      return
    }

    const idsOtros = propios.map((m) => (m.profile_a === miId ? m.profile_b : m.profile_a))

    const [{ data: perfiles }, { data: fotos }, { data: mensajes }] = await Promise.all([
      supabase.from('profiles').select('id, nombre').in('id', idsOtros),
      supabase
        .from('fotos')
        .select('profile_id, storage_path, orden')
        .in('profile_id', idsOtros)
        .eq('orden', 0),
      supabase
        .from('mensajes')
        .select('id, match_id, emisor_id, contenido, leido_at, created_at')
        .in(
          'match_id',
          propios.map((m) => m.id),
        )
        .order('created_at', { ascending: false }),
    ])

    const nombrePorId = new Map((perfiles ?? []).map((p) => [p.id, p.nombre as string]))
    const pathPorId = new Map((fotos ?? []).map((f) => [f.profile_id, f.storage_path as string]))
    const firmadas = await urlsFirmadas([...pathPorId.values()])

    const todos = (mensajes as Mensaje[]) ?? []
    const ultimoPorMatch = new Map<string, Mensaje>()
    const sinLeerPorMatch = new Map<string, number>()
    for (const msg of todos) {
      // Vienen ordenados desc, así que el primero de cada match es el último.
      if (!ultimoPorMatch.has(msg.match_id)) ultimoPorMatch.set(msg.match_id, msg)
      if (msg.emisor_id !== miId && !msg.leido_at) {
        sinLeerPorMatch.set(msg.match_id, (sinLeerPorMatch.get(msg.match_id) ?? 0) + 1)
      }
    }

    const armados: MatchConPerfil[] = propios.map((m) => {
      const otroId = m.profile_a === miId ? m.profile_b : m.profile_a
      const path = pathPorId.get(otroId)
      return {
        id: m.id,
        intencion: m.intencion,
        created_at: m.created_at,
        otro: {
          id: otroId,
          nombre: nombrePorId.get(otroId) ?? 'Alguien',
          foto: path ? (firmadas.get(path) ?? null) : null,
        },
        ultimoMensaje: ultimoPorMatch.get(m.id) ?? null,
        sinLeer: sinLeerPorMatch.get(m.id) ?? 0,
      }
    })

    // Los que tienen conversación van arriba, ordenados por actividad; los
    // matches todavía sin mensaje quedan abajo por fecha de match.
    armados.sort((a, b) => {
      const ta = a.ultimoMensaje?.created_at ?? a.created_at
      const tb = b.ultimoMensaje?.created_at ?? b.created_at
      return tb.localeCompare(ta)
    })

    setMatches(armados)
    setCargando(false)
  }, [miId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  useEffect(() => {
    if (!miId || MODO_DEMO) return

    const canal = supabase
      .channel(idCanal.current)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes' }, () => {
        void cargar()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, () => {
        void cargar()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(canal)
    }
  }, [miId, cargar])

  const sinLeerTotal = matches.reduce((acc, m) => acc + m.sinLeer, 0)

  return { matches, cargando, sinLeerTotal, recargar: cargar }
}
