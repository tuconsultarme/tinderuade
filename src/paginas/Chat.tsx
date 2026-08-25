import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { urlsFirmadas, urlsFirmadasChat, subirImagenChat } from '@/lib/fotos'
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

/** Columnas que se piden de mensajes, incluidas las de chat rico. */
const COLS = 'id, match_id, emisor_id, contenido, imagen_path, responde_a, leido_at, created_at'

const EMOJIS = [
  '😀', '😂', '🥹', '😍', '😎', '😭', '😅', '😉', '😘', '🥰',
  '😜', '🤔', '🙄', '😴', '🤩', '🥳', '😇', '🙃', '😢', '😡',
  '👍', '👎', '👏', '🙌', '🙏', '💪', '🤝', '👌', '✌️', '🤙',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '✨', '🔥',
  '🎉', '💯', '⚽', '📚', '☕', '🍺', '🍻', '🎓',
]

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

  // Chat rico.
  const [urlsImg, setUrlsImg] = useState<Map<string, string>>(new Map())
  const [respondiendoA, setRespondiendoA] = useState<Mensaje | null>(null)
  const [mostrarEmojis, setMostrarEmojis] = useState(false)
  const [verImagen, setVerImagen] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)

  const finLista = useRef<HTMLDivElement>(null)
  const inputArchivo = useRef<HTMLInputElement>(null)

  /** Firma las URLs de las imágenes que todavía no tenemos. */
  const firmarImagenes = useCallback(async (lista: Mensaje[]) => {
    const paths = [...new Set(lista.map((m) => m.imagen_path).filter((p): p is string => Boolean(p)))]
    if (paths.length === 0) return
    const mapa = await urlsFirmadasChat(paths)
    if (mapa.size === 0) return
    setUrlsImg((prev) => {
      const sig = new Map(prev)
      for (const [k, v] of mapa) sig.set(k, v)
      return sig
    })
  }, [])

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
        .select(COLS)
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
      void firmarImagenes(lista)
    })()

    return () => {
      vigente = false
    }
  }, [matchId, marcarLeidos, firmarImagenes])

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
            if (prev.some((m) => m.id === nuevo.id)) return prev
            return [...prev, nuevo]
          })
          if (nuevo.imagen_path) void firmarImagenes([nuevo])
          if (nuevo.emisor_id !== miId) void marcarLeidos([nuevo])
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(canal)
    }
  }, [matchId, miId, marcarLeidos, firmarImagenes])

  // Bajar al último mensaje.
  useEffect(() => {
    finLista.current?.scrollIntoView({ block: 'end' })
  }, [mensajes.length])

  function agregarMensaje(m: Mensaje) {
    setMensajes((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const contenido = texto.trim()
    if (!contenido || !matchId || !miId || enviando) return

    setEnviando(true)
    setTexto('')
    setMostrarEmojis(false)
    const citado = respondiendoA
    setRespondiendoA(null)

    if (MODO_DEMO) {
      const demo = enviarMensajeDemo(matchId, contenido)
      agregarMensaje(citado ? { ...demo, responde_a: citado.id } : demo)
      setEnviando(false)
      return
    }

    const { data, error: err } = await supabase
      .from('mensajes')
      .insert({ match_id: matchId, emisor_id: miId, contenido, responde_a: citado?.id ?? null })
      .select(COLS)
      .single()

    setEnviando(false)

    if (err) {
      setError('No se pudo enviar el mensaje.')
      setTexto(contenido)
      setRespondiendoA(citado)
      return
    }
    agregarMensaje(data as Mensaje)
  }

  async function elegirImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permitir volver a elegir la misma foto
    if (!file || !matchId || !miId) return

    if (MODO_DEMO) {
      setError('Las fotos necesitan la base conectada (no andan en modo demo).')
      return
    }

    const citado = respondiendoA
    setRespondiendoA(null)
    setMostrarEmojis(false)
    setSubiendo(true)
    setError(null)

    try {
      const path = await subirImagenChat(matchId, file)
      const { data, error: err } = await supabase
        .from('mensajes')
        .insert({ match_id: matchId, emisor_id: miId, imagen_path: path, responde_a: citado?.id ?? null })
        .select(COLS)
        .single()

      if (err) throw new Error(err.message)
      const msg = data as Mensaje
      await firmarImagenes([msg])
      agregarMensaje(msg)
    } catch {
      setError('No se pudo enviar la foto. Probá con otra o más tarde.')
    } finally {
      setSubiendo(false)
    }
  }

  function insertarEmoji(emoji: string) {
    setTexto((t) => t + emoji)
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
              <span className="block w-9 h-9 rounded-full overflow-hidden border border-lapiz bg-lapiz/40 shrink-0">
                {cabecera.foto && (
                  <img src={cabecera.foto} alt="" className="w-full h-full object-cover" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold truncate leading-tight">{cabecera.nombre}</span>
                <span className="dato text-grafito">Ver perfil</span>
              </span>
            </Link>
          )}
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 flex flex-col gap-1.5">
          {error && <Aviso>{error}</Aviso>}

          {mensajes.length === 0 && !error && (
            <p className="text-center text-sm text-grafito py-8 text-balance">
              Hicieron match. Rompé el hielo.
            </p>
          )}

          {mensajes.map((m) => (
            <Burbuja
              key={m.id}
              mensaje={m}
              mio={m.emisor_id === miId}
              nombreOtro={cabecera?.nombre ?? 'Alguien'}
              urlImagen={m.imagen_path ? (urlsImg.get(m.imagen_path) ?? null) : null}
              citado={m.responde_a ? mensajes.find((x) => x.id === m.responde_a) ?? null : null}
              miId={miId}
              onResponder={() => {
                setRespondiendoA(m)
                setMostrarEmojis(false)
              }}
              onAbrirImagen={setVerImagen}
            />
          ))}
          <div ref={finLista} />
        </div>

        {/* Cita del mensaje al que se responde. */}
        {respondiendoA && (
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-t border-lapiz bg-lapiz/30">
            <span className="w-1 self-stretch rounded-full bg-[var(--acento)]" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="dato text-[var(--grad-1)]">
                Respondiendo a {respondiendoA.emisor_id === miId ? 'vos' : cabecera?.nombre}
              </p>
              <p className="text-sm text-grafito truncate">
                {respondiendoA.contenido ?? '📷 Foto'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRespondiendoA(null)}
              aria-label="Cancelar respuesta"
              className="grid place-items-center w-7 h-7 rounded-full text-grafito active:scale-90"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        {/* Selector de emojis. */}
        {mostrarEmojis && (
          <div className="shrink-0 border-t border-lapiz px-2 py-2 max-h-40 overflow-y-auto">
            <div className="grid grid-cols-8 gap-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => insertarEmoji(e)}
                  className="text-2xl h-9 grid place-items-center rounded-lg active:scale-90"
                  aria-label={`Emoji ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={enviar}
          className="shrink-0 flex items-end gap-1.5 px-2 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] border-t border-lapiz"
        >
          <input
            ref={inputArchivo}
            type="file"
            accept="image/*"
            onChange={elegirImagen}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setMostrarEmojis((v) => !v)}
            aria-label="Emojis"
            aria-pressed={mostrarEmojis}
            className="w-10 h-10 shrink-0 grid place-items-center rounded-full text-grafito active:scale-90"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="9" cy="10" r="1.1" fill="currentColor" />
              <circle cx="15" cy="10" r="1.1" fill="currentColor" />
              <path d="M8.5 14.5a4 4 0 0 0 7 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => inputArchivo.current?.click()}
            disabled={subiendo}
            aria-label="Enviar una foto"
            className="w-10 h-10 shrink-0 grid place-items-center rounded-full text-grafito active:scale-90 disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="9" cy="10" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 17l4.5-4.5 4 4L15 13l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </button>

          <label htmlFor="mensaje" className="sr-only">
            Escribir un mensaje
          </label>
          <textarea
            id="mensaje"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void enviar(e)
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={subiendo ? 'Enviando foto…' : 'Escribí algo'}
            className="flex-1 max-h-28 px-3.5 py-2.5 text-base bg-lapiz/40 rounded-3xl resize-none focus:outline-none focus:ring-2 focus:ring-[var(--grad-1)]"
          />
          <button
            type="submit"
            disabled={!texto.trim() || enviando}
            aria-label="Enviar"
            className="w-11 h-11 shrink-0 grid place-items-center rounded-full gradiente text-papel-fija disabled:opacity-30"
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

      {/* Visor de imagen a pantalla completa. */}
      {verImagen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto"
          onClick={() => setVerImagen(null)}
          className="fixed inset-0 z-50 bg-black/90 grid place-items-center p-4"
        >
          <img src={verImagen} alt="Foto del chat" className="max-w-full max-h-full object-contain rounded-lg" />
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute top-4 right-4 grid place-items-center w-10 h-10 rounded-full bg-white/15 text-white"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </ShellPlano>
  )
}

interface BurbujaProps {
  mensaje: Mensaje
  mio: boolean
  nombreOtro: string
  urlImagen: string | null
  citado: Mensaje | null
  miId: string | undefined
  onResponder: () => void
  onAbrirImagen: (url: string) => void
}

function Burbuja({ mensaje, mio, nombreOtro, urlImagen, citado, miId, onResponder, onAbrirImagen }: BurbujaProps) {
  return (
    <div className={['group flex items-center gap-1.5', mio ? 'self-end flex-row-reverse' : 'self-start'].join(' ')}>
      <div
        className={[
          'max-w-[78vw] sm:max-w-[80%] px-2.5 py-2 rounded-2xl',
          mio ? 'bg-[var(--acento)] text-tinta-fija' : 'bg-lapiz/50',
        ].join(' ')}
      >
        {/* Cita del mensaje respondido. */}
        {citado && (
          <div
            className={[
              'mb-1.5 pl-2 py-1 rounded-lg text-xs border-l-2',
              mio ? 'bg-black/10 border-black/40' : 'bg-black/5 border-[var(--acento)]',
            ].join(' ')}
          >
            <span className="block font-semibold opacity-80">
              {citado.emisor_id === miId ? 'Vos' : nombreOtro}
            </span>
            <span className="block opacity-70 truncate">{citado.contenido ?? '📷 Foto'}</span>
          </div>
        )}

        {urlImagen && (
          <button
            type="button"
            onClick={() => onAbrirImagen(urlImagen)}
            className="block mb-1 overflow-hidden rounded-lg"
          >
            <img
              src={urlImagen}
              alt="Foto"
              className="max-w-[220px] max-h-[280px] object-cover"
              onLoad={() => {}}
            />
          </button>
        )}
        {/* Placeholder mientras se firma la URL de una imagen recién llegada. */}
        {mensaje.imagen_path && !urlImagen && (
          <div className="w-[180px] h-[140px] grid place-items-center rounded-lg bg-black/10 text-xs opacity-60">
            Cargando foto…
          </div>
        )}

        {mensaje.contenido && (
          <p className="text-[0.9375rem] leading-snug whitespace-pre-wrap break-words">
            {mensaje.contenido}
          </p>
        )}

        <time dateTime={mensaje.created_at} className="dato block mt-0.5 opacity-55 text-[0.5625rem]">
          {new Date(mensaje.created_at).toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}
        </time>
      </div>

      {/* Responder — aparece al pasar/tocar la burbuja. */}
      <button
        type="button"
        onClick={onResponder}
        aria-label="Responder"
        className="shrink-0 grid place-items-center w-7 h-7 rounded-full text-grafito opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity active:scale-90"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            d="M10 9V5l-7 7 7 7v-4c5 0 8 1.5 10 5 0-7-4-11-10-11Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}
