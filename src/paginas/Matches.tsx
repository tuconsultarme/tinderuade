import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSesion } from '@/context/SesionContext'
import { useMatches } from '@/hooks/useMatches'
import { Cargando, Vacio } from '@/components/ui/Estados'
import { definicion } from '@/lib/intenciones'
import type { MatchConPerfil } from '@/lib/tipos'

/** Saca acentos y mayúsculas para que "Tomas" encuentre a "Tomás". */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
}

export function Matches() {
  const { sesion } = useSesion()
  const { matches, cargando } = useMatches(sesion?.user.id)
  const [busqueda, setBusqueda] = useState('')

  if (cargando) return <Cargando texto="Buscando tus matches" />

  if (matches.length === 0) {
    return (
      <Vacio
        titulo="Todavía sin matches"
        detalle="Cuando alguien a quien marcaste te marque de vuelta, la conversación aparece acá."
      />
    )
  }

  const filtro = normalizar(busqueda.trim())
  const filtrados = filtro
    ? matches.filter((m) => normalizar(m.otro.nombre).includes(filtro))
    : matches

  return (
    <div className="px-4 py-4">
      <h1 className="text-3xl mb-4">Matches</h1>

      <div className="relative mb-4">
        <span
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-grafito pointer-events-none"
        >
          <svg viewBox="0 0 24 24" width="18" height="18">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path
              d="M16.5 16.5L21 21"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <input
          type="search"
          inputMode="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre"
          aria-label="Buscar matches por nombre"
          className="w-full min-h-11 pl-10 pr-9 bg-lapiz/40 rounded-full text-base text-tinta placeholder:text-grafito/70 focus:outline-none focus:ring-2 focus:ring-[var(--grad-1)]"
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => setBusqueda('')}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-7 h-7 rounded-full text-grafito active:scale-90 transition-transform"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <p className="text-center text-grafito py-8">
          No hay matches que coincidan con “{busqueda.trim()}”.
        </p>
      ) : (
        <ul className="flex flex-col">
          {filtrados.map((m) => (
            <li key={m.id}>
              <Fila match={m} miId={sesion!.user.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Fila({ match, miId }: { match: MatchConPerfil; miId: string }) {
  const { otro, ultimoMensaje, sinLeer, intencion } = match
  const mio = ultimoMensaje?.emisor_id === miId

  return (
    <Link
      to={`/chat/${match.id}`}
      data-modo={intencion}
      className="flex items-center gap-3 py-3 border-b border-lapiz"
    >
      <span className="relative shrink-0">
        <span className="block w-14 h-14 rounded-chip overflow-hidden border border-lapiz bg-lapiz/40">
          {otro.foto ? (
            <img
              src={otro.foto}
              alt={`Foto de ${otro.nombre}`}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : null}
        </span>
        {/* Marca del modo en que se dio el match. */}
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-papel bg-[var(--acento)]"
        />
      </span>

      <span className="flex-1 min-w-0">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-semibold truncate">{otro.nombre}</span>
          <span className="dato text-grafito shrink-0">{definicion(intencion).etiqueta}</span>
        </span>
        <span className="block text-sm text-grafito truncate">
          {ultimoMensaje
            ? `${mio ? 'Vos: ' : ''}${ultimoMensaje.contenido ?? '📷 Foto'}`
            : 'Hicieron match. Escribile.'}
        </span>
      </span>

      {sinLeer > 0 && (
        <span
          className="shrink-0 min-w-5 h-5 px-1.5 grid place-items-center rounded-full bg-tinta text-papel font-mono text-[0.625rem] tabular"
          aria-label={`${sinLeer} sin leer`}
        >
          {sinLeer > 9 ? '9+' : sinLeer}
        </span>
      )}
    </Link>
  )
}
