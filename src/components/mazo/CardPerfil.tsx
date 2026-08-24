import { forwardRef } from 'react'
import type { CandidatoConFotos, Intencion } from '@/lib/tipos'
import { CarruselFotos } from './CarruselFotos'

interface Props {
  candidato: CandidatoConFotos
  modo: Intencion
  refLike: React.RefObject<HTMLDivElement | null>
  refPass: React.RefObject<HTMLDivElement | null>
  onAbrir: () => void
}

/**
 * Cuánto de la card ocupa la foto según la lente activa.
 * En citas la foto es casi todo; en estudio cede lugar a las materias.
 *
 * El 70% de citas es el techo: más arriba, la franja de datos se queda sin
 * altura y la bio se corta a la mitad de una línea en vez de elidirse.
 */
const ALTO_FOTO: Record<Intencion, string> = {
  citas: '70%',
  amistad: '60%',
  estudio: '44%',
}

export const CardPerfil = forwardRef<HTMLDivElement, Props>(function CardPerfil(
  { candidato, modo, refLike, refPass, onAbrir },
  ref,
) {
  const { nombre, edad, carrera, sede, anio_ingreso, bio, materias_en_comun, fotos } = candidato

  return (
    <div
      ref={ref}
      // touch-action: none es lo que impide que el navegador se quede con el
      // gesto para hacer scroll y deje al arrastre sin eventos.
      className="absolute inset-0 touch-none select-none bg-papel border-2 border-tinta rounded-chip overflow-hidden flex flex-col"
    >
      {/* ---- Foto ---- */}
      <div
        data-flip-id="foto"
        className="relative shrink-0 overflow-hidden bg-lapiz/40"
        style={{ height: ALTO_FOTO[modo] }}
      >
        <CarruselFotos fotos={fotos} nombre={nombre} />

        {/* Nombre y edad sobre la foto: en citas es lo primero que se lee. */}
        {modo === 'citas' && (
          <div className="absolute left-0 right-0 bottom-0 p-4 pt-16 bg-gradient-to-t from-tinta/85 to-transparent">
            <h2 data-flip-id="nombre" className="text-papel text-[2rem] leading-none">
              {nombre}
              <span className="tabular font-mono text-xl font-normal ml-2">{edad}</span>
            </h2>
          </div>
        )}
      </div>

      {/* ---- Datos ---- */}
      <div className="flex-1 min-h-0 overflow-hidden p-4 flex flex-col gap-2.5">
        {modo !== 'citas' && (
          <h2 data-flip-id="nombre" className="text-[1.75rem] leading-none">
            {nombre}
            <span className="tabular font-mono text-lg font-normal text-grafito ml-2">{edad}</span>
          </h2>
        )}

        {/* En estudio, las materias en común son el dato que decide. */}
        {modo === 'estudio' && (
          <div data-flip-id="materias">
            {materias_en_comun > 0 ? (
              <p className="resaltado inline-block px-2 py-1 rounded-chip text-lg font-semibold leading-tight">
                {materias_en_comun}{' '}
                {materias_en_comun === 1 ? 'materia en común' : 'materias en común'}
              </p>
            ) : (
              <p className="dato text-grafito">Sin materias en común</p>
            )}
          </div>
        )}

        <p data-flip-id="datos" className="dato text-grafito">
          {[carrera, anio_ingreso ? `Ingresó ${anio_ingreso}` : null, sede]
            .filter(Boolean)
            .join(' · ') || 'Sin datos de carrera'}
        </p>

        {bio && (
          <p className={`text-sm text-tinta/85 leading-snug ${modo === 'citas' ? 'line-clamp-2' : 'line-clamp-3'}`}>
            {bio}
          </p>
        )}

        <button
          type="button"
          onClick={onAbrir}
          onPointerDown={(e) => e.stopPropagation()}
          className="dato text-tinta underline underline-offset-4 self-start mt-auto"
        >
          Ver perfil completo
        </button>
      </div>

      {/* ---- Capas de feedback del gesto ----
          Like = te resalto (relleno fluo del modo activo).
          Pass = te tacho (trazo de tinta cruzado).
          Empiezan en opacity 0; las maneja useArrastre por GSAP. */}
      <div
        ref={refLike}
        aria-hidden="true"
        className="absolute inset-0 opacity-0 pointer-events-none mix-blend-multiply"
        style={{ backgroundColor: 'var(--acento)' }}
      />
      <div
        ref={refPass}
        aria-hidden="true"
        className="absolute inset-0 opacity-0 pointer-events-none grid place-items-center bg-papel/70"
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
          aria-hidden="true"
        >
          <line x1="6" y1="8" x2="94" y2="92" stroke="var(--color-tinta)" strokeWidth="1.6" />
          <line x1="94" y1="8" x2="6" y2="92" stroke="var(--color-tinta)" strokeWidth="1.6" />
        </svg>
      </div>
    </div>
  )
})
