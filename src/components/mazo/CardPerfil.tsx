import { forwardRef } from 'react'
import type { CandidatoConFotos, Intencion } from '@/lib/tipos'
import { estiloNombre } from '@/lib/planes'
import { CarruselFotos } from './CarruselFotos'

interface Props {
  candidato: CandidatoConFotos
  modo: Intencion
  refLike: React.RefObject<HTMLDivElement | null>
  refPass: React.RefObject<HTMLDivElement | null>
  onAbrir: () => void
}

export const CardPerfil = forwardRef<HTMLDivElement, Props>(function CardPerfil(
  { candidato, modo, refLike, refPass, onAbrir },
  ref,
) {
  const { nombre, edad, carrera, sede, anio_ingreso, bio, materias_en_comun, fotos, plan } = candidato

  return (
    <div
      ref={ref}
      // touch-action: none impide que el navegador se quede con el gesto para
      // hacer scroll y deje al arrastre sin eventos.
      className="absolute inset-0 touch-none select-none bg-papel rounded-card overflow-hidden flex flex-col sombra-card"
    >
      {/* ---- Foto a pantalla completa ---- */}
      <div data-flip-id="foto" className="relative flex-1 min-h-0 overflow-hidden bg-lapiz/40">
        <CarruselFotos fotos={fotos} nombre={nombre} />

        {/* Info sobre la foto, con degradado para que el texto se lea siempre. */}
        <div className="absolute left-0 right-0 bottom-0 p-5 pt-24 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
          <h2
            data-flip-id="nombre"
            className="text-papel-fija text-[2rem] font-semibold leading-none flex items-end gap-2"
          >
            <span style={estiloNombre(plan ?? 'gratis')}>{nombre}</span>
            <span className="tabular text-2xl font-normal">{edad}</span>
          </h2>

          {/* En estudio, las materias en común son el dato que decide. */}
          {modo === 'estudio' && materias_en_comun > 0 && (
            <div data-flip-id="materias" className="mt-2">
              <span className="inline-block gradiente text-papel-fija px-2.5 py-1 rounded-full text-sm font-semibold">
                {materias_en_comun} {materias_en_comun === 1 ? 'materia en común' : 'materias en común'}
              </span>
            </div>
          )}

          <p data-flip-id="datos" className="mt-2 text-papel-fija/90 text-sm font-medium">
            {[carrera, anio_ingreso ? `Ingresó ${anio_ingreso}` : null, sede]
              .filter(Boolean)
              .join(' · ') || 'Sin datos de carrera'}
          </p>

          {bio && <p className="mt-1 text-papel-fija/80 text-sm leading-snug line-clamp-2">{bio}</p>}

          <button
            type="button"
            onClick={onAbrir}
            onPointerDown={(e) => e.stopPropagation()}
            className="mt-3 inline-flex items-center gap-1 text-papel-fija/90 text-sm font-semibold"
          >
            Ver perfil completo
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                d="M9 6l6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ---- Sellos de feedback del gesto ----
          Like = "LIKE" verde inclinado a la izquierda (arrastre a la derecha).
          Pass = "NOPE" rojo inclinado a la derecha (arrastre a la izquierda).
          Empiezan en opacity 0; los maneja useArrastre por GSAP. */}
      <div
        ref={refLike}
        aria-hidden="true"
        className="absolute top-8 left-6 opacity-0 pointer-events-none -rotate-[18deg]"
      >
        <span
          className="block px-3 py-1 rounded-lg text-4xl font-extrabold tracking-wide uppercase"
          style={{ color: 'var(--color-like)', border: '4px solid var(--color-like)' }}
        >
          Like
        </span>
      </div>
      <div
        ref={refPass}
        aria-hidden="true"
        className="absolute top-8 right-6 opacity-0 pointer-events-none rotate-[18deg]"
      >
        <span
          className="block px-3 py-1 rounded-lg text-4xl font-extrabold tracking-wide uppercase"
          style={{ color: 'var(--color-nope)', border: '4px solid var(--color-nope)' }}
        >
          Nope
        </span>
      </div>
    </div>
  )
})
