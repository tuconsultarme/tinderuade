import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { urlsFirmadas } from '@/lib/fotos'
import { useSesion } from '@/context/SesionContext'
import { ShellPlano } from '@/components/shell/AppShell'
import { Cargando, Aviso } from '@/components/ui/Estados'
import {
  MODO_DEMO,
  cabeceraDemo,
  mensajesDeMatchDemo,
  enviarMensajeDemo,
  marcarLeidosDemo,
} from '@/lib/demo'
import type { Mensaje, Intencion } from '@/lib/tipos'

interface Cabecera {
  nombre: string
  foto: string | null
  otroId: string
  intencion: Intencion
}

export function Chat() {
  const { matchId } = useParams<{ matchId: string }>()
  const { sesion } = useSesion()
  const navegar = useNavigate()
  const miId = sesion?.user.id

  const [cabecera, setCabecera] = useState<Cabecera | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const finLista = useRef<HTMLDivElement>(null)

  // ---- Cabecera: quién es el otro ----
  useEffect(() => {
    if (!matchId || !miId) return

    if (MODO_DEMO) {
      const c = cabeceraDemo(matchId)
      if (c) setCabecera(c)
      else setError('Ese match no existe.')
      return
    }

    let vigente = true

    ;(async () => {
      const { data: match } = await supabase
        .from('matches')
        .select('profile_a, profile_b, intencion')
        .eq('id', matchId)
        .maybeSingle()

      if (!match) {
        if (vigente) setError('Ese match no existe o ya no está activo.')
        return
      }

      const otroId = match.profile_a === miId ? match.profile_b : match.profile_a
      const [{ data: perfil }, { data: foto }] = await Promise.all([
        supabase.from('profiles').select('nombre').eq('id', otroId).maybeSingle(),
        supabase
          .from('fotos')
          .select('storage_path')
          .eq('profile_id', otroId)
          .eq('orden', 0)
          .maybeSingle(),
      ])

      const firmadas = foto ? await urlsFirmadas([foto.storage_path]) : new Map()
      if (!vigente) return

      setCabecera({
        nombre: perfil?.nombre ?? 'Alguien',
        foto: foto ? (firmadas.get(foto.storage_path) ?? null) : null,
        otroId,
        intencion: match.intencion as Intencion,
      })
    })()

    return () => {
      vigente = false
    }
  }, [matchId, miId])

  // ---- Historial ----
  const marcarLeidos = useCallback(
    async (lista: Mensaje[]) => {
      if (MODO_DEMO) {
        if (matchId) marcarLeidosDemo(matchId)
        return
      }
      if (!miId) return
      const pendientes = lista.filter((m) => m.emisor_id !== miId && !m.leido_at).map((m) => m.id)
      if (pendientes.length === 0) return
      // Solo se puede tocar leido_at: el grant por columna de 0003 bloquea
      // cualquier intento de reescribir el contenido ajeno.
      await supabase.from('mensajes').update({ leido_at: new Date().toISOString() }).in('id', pendientes)
    },
    [miId, matchId],
  )

  useEffect(() => {
    if (!matchId) return

    if (MODO_DEMO) {
      const lista = mensajesDeMatchDemo(matchId)
      setMensajes(lista)
      setCargando(false)
      void marcarLeidos(lista)
      return
    }

    let vigente = true

    ;(async () => {
      const { data, error: err } = await supabase
        .from('mensajes')
        .select('id, match_id, emisor_id, contenido, leido_at, created_at')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true })

      if (!vigente) return
      if (err) {
        setError('No se pudieron cargar los mensajes.')
        setCargando(false)
        return
      }

      const lista = (data as Mensaje[]) ?? []
      setMensajes(lista)
      setCargando(false)
      void marcarLeidos(lista)
    })()

    return () => {
      vigente = false
    }
  }, [matchId, marcarLeidos])

  // ---- Realtime ----
  useEffect(() => {
    if (!matchId || MODO_DEMO) return

    const canal = supabase
      .channel(`chat-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const nuevo = payload.new as Mensaje
          setMensajes((prev) => {
            // El propio mensaje ya se insertó de forma optimista.
            if (prev.some((m) => m.id === nuevo.id)) return prev
            return [...prev, nuevo]
          })
          if (nuevo.emisor_id !== miId) void marcarLeidos([nuevo])
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(canal)
    }
  }, [matchId, miId, marcarLeidos])

  // Bajar al último mensaje. 'auto' y no 'smooth': al abrir el chat el scroll
  // animado desde arriba se ve como un glitch.
  useEffect(() => {
    finLista.current?.scrollIntoView({ block: 'end' })
  }, [mensajes.length])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const contenido = texto.trim()
    if (!contenido || !matchId || !miId || enviando) return

    setEnviando(true)
    setTexto('')

    if (MODO_DEMO) {
      setMensajes((prev) => [...prev, enviarMensajeDemo(matchId, contenido)])
      setEnviando(false)
      return
    }

    const { data, error: err } = await supabase
      .from('mensajes')
      .insert({ match_id: matchId, emisor_id: miId, contenido })
      .select()
      .single()

    setEnviando(false)

    if (err) {
      setError('No se pudo enviar el mensaje.')
      setTexto(contenido) // devolver lo escrito, no perderlo
      return
    }
    setMensajes((prev) =>
      prev.some((m) => m.id === (data as Mensaje).id) ? prev : [...prev, data as Mensaje],
    )
  }

  if (cargando) {
    return (
      <ShellPlano>
        <Cargando texto="Abriendo la conversación" />
      </ShellPlano>
    )
  }

  return (
    <ShellPlano scroll={false}>
      <div data-modo={cabecera?.intencion} className="h-full flex flex-col">
        <header className="shrink-0 flex items-center gap-3 px-3 py-2.5 border-b border-lapiz">
          <button
            type="button"
            onClick={() => navegar('/matches')}
            aria-label="Volver a matches"
            className="w-10 h-10 grid place-items-center -ml-1"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {cabecera && (
            <Link to={`/perfil/${cabecera.otroId}`} className="flex items-center gap-2.5 min-w-0">
              <span className="block w-9 h-9 rounded-chip overflow-hidden border border-lapiz bg-lapiz/40 shrink-0">
                {cabecera.foto && (
                  <img
                    src={cabecera.foto}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold truncate leading-tight">{cabecera.nombre}</span>
                <span className="dato text-grafito">Ver perfil</span>
              </span>
            </Link>
          )}
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 flex flex-col gap-2">
          {error && <Aviso>{error}</Aviso>}

          {mensajes.length === 0 && !error && (
            <p className="text-center text-sm text-grafito py-8 text-balance">
              Hicieron match. Rompé el hielo.
            </p>
          )}

          {mensajes.map((m) => {
            const mio = m.emisor_id === miId
            return (
              <div
                key={m.id}
                className={[
                  'max-w-[80%] px-3 py-2 rounded-chip',
                  mio
                    ? 'self-end bg-[var(--acento)] text-tinta-fija'
                    : 'self-start bg-papel border border-lapiz',
                ].join(' ')}
              >
                <p className="text-[0.9375rem] leading-snug whitespace-pre-wrap break-words">
                  {m.contenido}
                </p>
                <time
                  dateTime={m.created_at}
                  className="dato block mt-1 opacity-55 text-[0.5625rem]"
                >
                  {new Date(m.created_at).toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    // Sin esto sale "02:53 P. M.": en Argentina la hora va de 0 a 23.
                    hour12: false,
                  })}
                </time>
              </div>
            )
          })}
          <div ref={finLista} />
        </div>

        <form
          onSubmit={enviar}
          className="shrink-0 flex items-end gap-2 px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] border-t border-lapiz"
        >
          <label htmlFor="mensaje" className="sr-only">
            Escribir un mensaje
          </label>
          <textarea
            id="mensaje"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              // Enter manda, Shift+Enter hace salto de línea. En el celular el
              // teclado muestra "enter" normal, así que no molesta.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void enviar(e)
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Escribí algo"
            className="flex-1 max-h-28 px-3.5 py-2.5 text-base bg-transparent border border-lapiz rounded-chip resize-none focus:border-tinta focus:outline-none"
          />
          <button
            type="submit"
            disabled={!texto.trim() || enviando}
            aria-label="Enviar"
            className="w-11 h-11 shrink-0 grid place-items-center rounded-chip bg-tinta text-papel disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M4 12h15M13 6l6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>
      </div>
    </ShellPlano>
  )
}
