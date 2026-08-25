import { useState } from 'react'

interface Props {
  fotos: string[]
  nombre: string
}

function FlechaCarrusel({ direccion }: { direccion: 'izquierda' | 'derecha' }) {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" aria-hidden="true">
      <path
        d={direccion === 'izquierda' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Carrusel de fotos con zonas de tap a los costados.
 *
 * La flecha es solo la pista visual —el fondo de las fotos de prueba es del
 * mismo color que los puntos indicadores de arriba, así que sin ella no se
 * nota que hay más de una foto—; el tap funciona en toda la zona, no solo
 * sobre el ícono. Los botones también son navegables con tab, porque la zona
 * de tap invisible no existe para un lector de pantalla.
 */
export function CarruselFotos({ fotos, nombre }: Props) {
  // No hace falta resetear el índice al cambiar de persona: <CardPerfil> lleva
  // key={candidato.id}, así que este componente se remonta de cero con cada
  // candidato nuevo.
  const [i, setI] = useState(0)

  const total = fotos.length
  const hayVarias = total > 1

  function mover(delta: number, e: React.MouseEvent | React.KeyboardEvent) {
    // Sin esto el tap para cambiar de foto arranca también el arrastre.
    e.stopPropagation()
    setI((actual) => Math.min(total - 1, Math.max(0, actual + delta)))
  }

  if (total === 0) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-lapiz/50">
        <span className="dato text-grafito">Sin foto</span>
      </div>
    )
  }

  return (
    <>
      {fotos.map((src, idx) => (
        <img
          key={src}
          src={src}
          alt={idx === 0 ? `Foto de ${nombre}` : `Foto ${idx + 1} de ${nombre}`}
          draggable={false}
          loading={idx === 0 ? 'eager' : 'lazy'}
          className={[
            'absolute inset-0 w-full h-full object-cover select-none',
            'transition-opacity duration-200',
            idx === i ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        />
      ))}

      {hayVarias && (
        <>
          {/* Indicadores de posición, arriba. */}
          <div className="absolute top-2 left-2 right-2 flex gap-1" aria-hidden="true">
            {fotos.map((src, idx) => (
              <span
                key={src}
                className={[
                  'flex-1 h-[3px] rounded-full',
                  idx === i ? 'bg-papel-fija' : 'bg-papel-fija/35',
                ].join(' ')}
              />
            ))}
          </div>

          {/* Zonas de tap. Ocupan el alto completo salvo la franja de datos. La
              flecha es solo la pista visual: el tap funciona en toda la zona. */}
          <button
            type="button"
            onClick={(e) => mover(-1, e)}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={i === 0}
            aria-label={`Foto anterior de ${nombre}`}
            className="absolute left-0 top-0 bottom-24 w-1/3 flex items-center justify-start pl-2 disabled:pointer-events-none"
          >
            {i > 0 && (
              <span className="grid place-items-center w-8 h-8 rounded-full bg-tinta-fija/45 text-papel-fija">
                <FlechaCarrusel direccion="izquierda" />
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => mover(1, e)}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={i === total - 1}
            aria-label={`Foto siguiente de ${nombre}`}
            className="absolute right-0 top-0 bottom-24 w-1/3 flex items-center justify-end pr-2 disabled:pointer-events-none"
          >
            {i < total - 1 && (
              <span className="grid place-items-center w-8 h-8 rounded-full bg-tinta-fija/45 text-papel-fija">
                <FlechaCarrusel direccion="derecha" />
              </span>
            )}
          </button>

          <span className="sr-only" aria-live="polite">
            Foto {i + 1} de {total}
          </span>
        </>
      )}
    </>
  )
}
