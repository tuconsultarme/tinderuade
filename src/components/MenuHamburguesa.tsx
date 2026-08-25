import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlternadorTema } from './AlternadorTema'
import { supabase } from '@/lib/supabase'
import { useSesion } from '@/context/SesionContext'
import { definicion } from '@/lib/intenciones'
import { MODO_DEMO } from '@/lib/demo'
import type { Intencion } from '@/lib/tipos'

interface Plan {
  nombre: string
  precio: string
  destacado?: boolean
  beneficios: string[]
}

/** Planes de ejemplo — todavía no hay cobros conectados. */
const PLANES: Plan[] = [
  {
    nombre: 'Gratis',
    precio: '$0',
    beneficios: ['Swipes limitados por día', 'Chat con tus matches', 'Las tres lentes'],
  },
  {
    nombre: 'Plus',
    precio: '$2.500 / mes',
    destacado: true,
    beneficios: ['Likes ilimitados', 'Deshacer sin límite', 'Sin publicidad'],
  },
  {
    nombre: 'Gold',
    precio: '$4.900 / mes',
    beneficios: ['Todo lo de Plus', 'Ves quién te dio like', '5 destacados por semana'],
  },
]

type Vista = 'menu' | 'planes' | 'historial' | 'bloqueados'

interface MatchHist {
  otroId: string
  nombre: string
  intencion: Intencion
  /** 'aceptado' = match mutuo; 'pendiente' = like tuyo sin respuesta todavía. */
  estado: 'pendiente' | 'aceptado'
  activo: boolean
  fecha: string
}

interface Bloqueado {
  id: string
  nombre: string | null
  fecha: string
}

const TITULOS: Record<Vista, string> = {
  menu: 'Menú',
  planes: 'Planes',
  historial: 'Historial de matches',
  bloqueados: 'Perfiles bloqueados',
}

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Menú lateral que se abre desde el botón de hamburguesa de la barra superior.
 * Adentro: Configuración (tema noche/día), Historial de matches, Perfiles
 * bloqueados, Planes y, abajo del todo, Cerrar sesión.
 */
export function MenuHamburguesa() {
  const [abierto, setAbierto] = useState(false)
  const [vista, setVista] = useState<Vista>('menu')
  const { salir, sesion } = useSesion()
  const navegar = useNavigate()
  const miId = sesion?.user.id

  const [historial, setHistorial] = useState<MatchHist[] | null>(null)
  const [bloqueados, setBloqueados] = useState<Bloqueado[] | null>(null)
  const [cargandoLista, setCargandoLista] = useState(false)
  const [errorLista, setErrorLista] = useState<string | null>(null)

  // Cerrar con Escape.
  useEffect(() => {
    if (!abierto) return
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', alTecla)
    return () => window.removeEventListener('keydown', alTecla)
  }, [abierto])

  function cerrar() {
    setAbierto(false)
    setVista('menu')
  }

  function abrir(v: Vista) {
    setVista(v)
    setErrorLista(null)
    if (v === 'historial') void cargarHistorial()
    if (v === 'bloqueados') void cargarBloqueados()
  }

  async function cargarHistorial() {
    if (MODO_DEMO || !miId) {
      setHistorial([])
      return
    }
    setCargandoLista(true)
    setErrorLista(null)

    // Matches (mutuos, la RLS ya devuelve solo los míos) + mis likes (para los
    // que todavía no respondieron: esos son los "pendientes").
    const [{ data: ms, error: em }, { data: sw, error: es }] = await Promise.all([
      supabase.from('matches').select('profile_a, profile_b, intencion, activo, created_at'),
      supabase.from('swipes').select('receptor_id, intencion, created_at').eq('direccion', 'like'),
    ])

    if (em || es) {
      setErrorLista('No se pudo cargar el historial.')
      setCargandoLista(false)
      return
    }

    const matches = ms ?? []
    const likes = sw ?? []

    // Con qué personas (por intención) ya hay match, para no listar el like como
    // pendiente si en realidad ya fue correspondido.
    const yaMatch = new Set(
      matches.map((m) => `${m.profile_a === miId ? m.profile_b : m.profile_a}|${m.intencion}`),
    )

    const items: MatchHist[] = []
    for (const m of matches) {
      const otroId = m.profile_a === miId ? m.profile_b : m.profile_a
      items.push({
        otroId,
        nombre: '',
        intencion: m.intencion as Intencion,
        estado: 'aceptado',
        activo: m.activo as boolean,
        fecha: m.created_at as string,
      })
    }
    for (const s of likes) {
      if (yaMatch.has(`${s.receptor_id}|${s.intencion}`)) continue
      items.push({
        otroId: s.receptor_id as string,
        nombre: '',
        intencion: s.intencion as Intencion,
        estado: 'pendiente',
        activo: true,
        fecha: s.created_at as string,
      })
    }

    // Nombres en una sola consulta.
    const ids = [...new Set(items.map((i) => i.otroId))]
    const { data: perfiles } = ids.length
      ? await supabase.from('profiles').select('id, nombre').in('id', ids)
      : { data: [] as { id: string; nombre: string }[] }
    const nombre = new Map((perfiles ?? []).map((p) => [p.id, p.nombre as string]))
    for (const it of items) it.nombre = nombre.get(it.otroId) ?? 'Perfil no disponible'

    items.sort((a, b) => b.fecha.localeCompare(a.fecha))
    setHistorial(items)
    setCargandoLista(false)
  }

  async function cargarBloqueados() {
    if (MODO_DEMO || !miId) {
      setBloqueados([])
      return
    }
    setCargandoLista(true)
    setErrorLista(null)

    // Primero la función que trae los nombres (migración 0009).
    const { data, error } = await supabase.rpc('mis_bloqueados')
    if (!error) {
      const filas = (data ?? []) as { id: string; nombre: string; bloqueado_at: string }[]
      setBloqueados(filas.map((r) => ({ id: r.id, nombre: r.nombre, fecha: r.bloqueado_at })))
      setCargandoLista(false)
      return
    }

    // Sin la migración 0009: se listan igual, con fecha y desbloquear, pero sin
    // el nombre (la RLS de profiles oculta a los bloqueados).
    const { data: bl, error: e2 } = await supabase
      .from('bloqueos')
      .select('bloqueado_id, created_at')
      .order('created_at', { ascending: false })

    if (e2) {
      setErrorLista('No se pudieron cargar los bloqueados.')
      setCargandoLista(false)
      return
    }
    setBloqueados((bl ?? []).map((b) => ({ id: b.bloqueado_id as string, nombre: null, fecha: b.created_at as string })))
    setCargandoLista(false)
  }

  async function desbloquear(id: string) {
    if (!miId) return
    const previo = bloqueados
    setBloqueados((b) => (b ?? []).filter((x) => x.id !== id))
    const { error } = await supabase
      .from('bloqueos')
      .delete()
      .eq('bloqueador_id', miId)
      .eq('bloqueado_id', id)
    if (error) {
      setBloqueados(previo)
      setErrorLista('No se pudo desbloquear. Probá de nuevo.')
    }
  }

  const enSubvista = vista !== 'menu'

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú"
        aria-expanded={abierto}
        className="grid place-items-center w-10 h-10 rounded-full border border-lapiz bg-papel/60 text-tinta backdrop-blur-sm transition-transform duration-150 active:scale-90"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Fondo oscurecido */}
      <div
        onClick={cerrar}
        aria-hidden="true"
        className={[
          'fixed inset-0 z-50 bg-black/50 transition-opacity duration-200',
          abierto ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        className={[
          'fixed top-0 right-0 z-50 h-[100dvh] w-[80%] max-w-[320px]',
          'bg-papel border-l border-lapiz flex flex-col',
          'transition-transform duration-300 ease-out',
          abierto ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Encabezado */}
        <div className="shrink-0 flex items-center justify-between px-5 h-16 border-b border-lapiz">
          <span className="text-xl font-extrabold resaltado">{TITULOS[vista]}</span>
          <button
            type="button"
            onClick={enSubvista ? () => setVista('menu') : cerrar}
            aria-label={enSubvista ? 'Volver' : 'Cerrar menú'}
            className="grid place-items-center w-9 h-9 rounded-full text-grafito active:scale-90 transition-transform"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              {enSubvista ? (
                <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {vista === 'menu' && (
            <div className="flex flex-col">
              <p className="dato text-grafito mb-2">Configuración</p>
              <div className="flex items-center justify-between py-2">
                <span className="font-semibold">Modo noche / día</span>
                <AlternadorTema />
              </div>

              <p className="dato text-grafito mt-5 mb-1">Tu actividad</p>
              <ItemNav
                etiqueta="Matches recibidos"
                onClick={() => {
                  cerrar()
                  navegar('/recibidos')
                }}
              />
              <ItemNav etiqueta="Historial de matches" onClick={() => abrir('historial')} />
              <ItemNav etiqueta="Perfiles bloqueados" onClick={() => abrir('bloqueados')} />

              <p className="dato text-grafito mt-5 mb-1">Suscripción</p>
              <ItemNav etiqueta="Ver planes" onClick={() => abrir('planes')} />
            </div>
          )}

          {vista === 'planes' && (
            <ul className="flex flex-col gap-3">
              {PLANES.map((plan) => (
                <li
                  key={plan.nombre}
                  className={['rounded-2xl p-4', plan.destacado ? 'gradiente text-papel-fija sombra-boton' : 'border border-lapiz'].join(' ')}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-extrabold">{plan.nombre}</span>
                    <span className={['text-sm font-semibold', plan.destacado ? '' : 'text-grafito'].join(' ')}>{plan.precio}</span>
                  </div>
                  <ul className={['mt-2 flex flex-col gap-1 text-sm', plan.destacado ? 'text-papel-fija/90' : 'text-grafito'].join(' ')}>
                    {plan.beneficios.map((b) => (
                      <li key={b} className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                          <path d="M5 12l4 4 10-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {b}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
              <p className="text-xs text-grafito text-center mt-1">Los pagos todavía no están habilitados.</p>
            </ul>
          )}

          {vista === 'historial' && (
            <Lista
              cargando={cargandoLista}
              error={errorLista}
              vacio="Todavía no diste ningún like ni tuviste matches."
              hayItems={Boolean(historial?.length)}
            >
              {historial?.map((m, i) => (
                <li key={`${m.otroId}-${i}`} className="flex items-center gap-3 py-3 border-b border-lapiz">
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold truncate">{m.nombre}</span>
                    <span className="dato text-grafito">
                      {definicion(m.intencion).etiqueta} · {fmtFecha(m.fecha)}
                      {m.estado === 'aceptado' && !m.activo && ' · deshecho'}
                    </span>
                  </span>
                  <span
                    className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold"
                    style={
                      m.estado === 'aceptado'
                        ? { backgroundColor: 'var(--color-like)', color: '#fff' }
                        : { backgroundColor: 'var(--color-rewind)', color: '#1a1a1c' }
                    }
                  >
                    {m.estado === 'aceptado' ? 'Aceptado' : 'Pendiente'}
                  </span>
                </li>
              ))}
            </Lista>
          )}

          {vista === 'bloqueados' && (
            <Lista
              cargando={cargandoLista}
              error={errorLista}
              vacio="No tenés perfiles bloqueados."
              hayItems={Boolean(bloqueados?.length)}
            >
              {bloqueados?.map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-3 border-b border-lapiz">
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold truncate">{b.nombre ?? 'Perfil bloqueado'}</span>
                    <span className="dato text-grafito">Bloqueado el {fmtFecha(b.fecha)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void desbloquear(b.id)}
                    className="shrink-0 min-h-9 px-3 rounded-full border-2 border-lapiz font-bold uppercase tracking-wide text-xs active:scale-95 transition-transform"
                  >
                    Desbloquear
                  </button>
                </li>
              ))}
            </Lista>
          )}
        </div>

        {/* Cerrar sesión, abajo del todo */}
        {!MODO_DEMO && (
          <div className="shrink-0 p-5 border-t border-lapiz">
            <button
              type="button"
              onClick={() => void salir()}
              className="w-full min-h-12 rounded-full border-2 border-lapiz font-bold uppercase tracking-wide text-sm text-[var(--color-nope)] transition-transform duration-150 active:scale-[0.97]"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>
    </>
  )
}

function ItemNav({ etiqueta, onClick }: { etiqueta: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center justify-between py-3 text-left">
      <span className="font-semibold">{etiqueta}</span>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className="text-grafito">
        <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

interface ListaProps {
  cargando: boolean
  error: string | null
  vacio: string
  hayItems: boolean
  children: React.ReactNode
}

function Lista({ cargando, error, vacio, hayItems, children }: ListaProps) {
  if (cargando) return <p className="text-center text-grafito py-8">Cargando…</p>
  if (error) return <p className="text-center text-[var(--color-nope)] py-8">{error}</p>
  if (!hayItems) return <p className="text-center text-grafito py-8 text-balance">{vacio}</p>
  return <ul className="flex flex-col">{children}</ul>
}
