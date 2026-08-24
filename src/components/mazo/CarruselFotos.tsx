import { useState } from 'react'

interface Props {
  fotos: string[]
  nombre: string
}

/**
 * Carrusel de fotos con zonas de tap a los costados.
 *
 * Las flechas de teclado no alcanzan como única vía: los botones son
 * navegables con tab y anuncian la posición, porque la zona de tap invisible
 * no existe para un lector de pantalla.
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
                  idx === i ? 'bg-papel' : 'bg-papel/35',
                ].join(' ')}
              />
            ))}
          </div>

          {/* Zonas de tap. Ocupan el alto completo salvo la franja de datos. */}
          <button
            type="button"
            onClick={(e) => mover(-1, e)}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={i === 0}
            aria-label={`Foto anterior de ${nombre}`}
            className="absolute left-0 top-0 bottom-24 w-1/3 disabled:pointer-events-none"
          />
          <button
            type="button"
            onClick={(e) => mover(1, e)}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={i === total - 1}
            aria-label={`Foto siguiente de ${nombre}`}
            className="absolute right-0 top-0 bottom-24 w-1/3 disabled:pointer-events-none"
          />

          <span className="sr-only" aria-live="polite">
            Foto {i + 1} de {total}
          </span>
        </>
      )}
    </>
  )
}
