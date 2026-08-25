import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useSesion } from '@/context/SesionContext'
import { useToast } from '@/components/ui/Toast'
import { Cargando, Vacio, Aviso } from '@/components/ui/Estados'
import { definicion } from '@/lib/intenciones'
import { MODO_DEMO } from '@/lib/demo'
import type { Intencion } from '@/lib/tipos'

interface Recibido {
  emisorId: string
  nombre: string
  intencion: Intencion
  fecha: string
}

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Los likes que otras personas te dieron y todavía no respondiste. Podés
 * devolverlos (arma el match en el acto, porque el otro ya te dio like) o
 * rechazarlos (queda registrado como "pasar" y no vuelve a aparecer).
 */
export function MatchesRecibidos() {
  const { sesion } = useSesion()
  const { mostrar } = useToast()
  const miId = sesion?.user.id

  const [recibidos, setRecibidos] = useState<Recibido[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (MODO_DEMO || !miId) {
      setRecibidos([])
      return
    }
    setError(null)
    const { data, error: err } = await supabase.rpc('mis_likes_recibidos')
    if (err) {
      setRecibidos([])
      setError(
        'No se pudieron cargar los likes recibidos. Si es la primera vez, hay que aplicar la migración 0010 en Supabase.',
      )
      return
    }
    const filas = (data ?? []) as { emisor_id: string; nombre: string; intencion: Intencion; recibido_at: string }[]
    setRecibidos(
      filas.map((r) => ({
        emisorId: r.emisor_id,
        nombre: r.nombre ?? 'Alguien',
        intencion: r.intencion,
        fecha: r.recibido_at,
      })),
    )
  }, [miId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function responder(r: Recibido, direccion: 'like' | 'pass') {
    if (!miId || ocupado) return
    const clave = `${r.emisorId}-${r.intencion}`
    setOcupado(clave)

    const { error: err } = await supabase.from('swipes').insert({
      emisor_id: miId,
      receptor_id: r.emisorId,
      direccion,
      intencion: r.intencion,
    })

    setOcupado(null)

    if (err) {
      setError(direccion === 'like' ? 'No se pudo devolver el like.' : 'No se pudo rechazar.')
      return
    }

    setRecibidos((prev) => (prev ?? []).filter((x) => !(x.emisorId === r.emisorId && x.intencion === r.intencion)))
    mostrar(direccion === 'like' ? '¡Es un match! Ya podés escribirle.' : 'Listo, no lo vas a ver más.')
  }

  if (recibidos === null) return <Cargando texto="Buscando quién te dio like" />

  return (
    <div className="px-4 py-4">
      <h1 className="text-3xl mb-1">Te dieron like</h1>
      <p className="text-sm text-grafito mb-4">Devolvé el like para armar el match, o rechazá.</p>

      {error && <div className="mb-4"><Aviso>{error}</Aviso></div>}

      {recibidos.length === 0 && !error ? (
        <Vacio
          titulo="Todavía nadie"
          detalle="Cuando alguien te dé like y vos no lo hayas visto en el mazo, va a aparecer acá para que decidas."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {recibidos.map((r) => {
            const clave = `${r.emisorId}-${r.intencion}`
            const trabajando = ocupado === clave
            return (
              <li
                key={clave}
                data-modo={r.intencion}
                className="flex items-center gap-3 p-3 rounded-2xl border border-lapiz"
              >
                <span className="w-11 h-11 shrink-0 rounded-full grid place-items-center gradiente text-papel-fija font-bold text-lg">
                  {r.nombre.charAt(0).toUpperCase()}
                </span>

                <span className="flex-1 min-w-0">
                  <span className="block font-semibold truncate">{r.nombre}</span>
                  <span className="dato text-grafito">
                    {definicion(r.intencion).etiqueta} · {fmtFecha(r.fecha)}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => void responder(r, 'pass')}
                  disabled={trabajando}
                  aria-label={`Rechazar a ${r.nombre}`}
                  className="w-10 h-10 shrink-0 grid place-items-center rounded-full border-2 disabled:opacity-40 active:scale-90 transition-transform"
                  style={{ color: 'var(--color-nope)', borderColor: 'var(--color-nope)' }}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => void responder(r, 'like')}
                  disabled={trabajando}
                  aria-label={`Devolver el like a ${r.nombre}`}
                  className="w-10 h-10 shrink-0 grid place-items-center rounded-full border-2 disabled:opacity-40 active:scale-90 transition-transform"
                  style={{ color: 'var(--color-like)', borderColor: 'var(--color-like)' }}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path
                      d="M12 20.5C6 16 3 12.5 3 9a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1c0 3.5-3 7-9 11.5Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
