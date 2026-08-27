interface Props {
  onPass: () => void
  onLike: () => void
  etiquetaLike: string
  deshabilitado?: boolean
  /** True cuando se acabó el cupo diario de likes (plan gratis). */
  likeBloqueado?: boolean
  /** Sin handler, el botón de deshacer ni aparece: no hay nada que deshacer. */
  onDeshacer?: () => void
}

/**
 * Los botones bajo el mazo, estilo Tinder: círculos blancos con el ícono y el
 * anillo pintados del color de cada acción, y una sombra suave que los levanta
 * del fondo. Para quien no quiere arrastrar (y para quien navega con teclado).
 *
 * Deshacer (amarillo) · Pasar (rojo) · Me gusta (verde).
 */
export function Acciones({
  onPass,
  onLike,
  etiquetaLike,
  deshabilitado = false,
  likeBloqueado = false,
  onDeshacer,
}: Props) {
  return (
    <div className="relative shrink-0 flex items-center justify-center gap-6 py-4">
      {/* Deshacer va absoluto a la izquierda: así la cruz y el corazón quedan
          siempre centrados, aparezca o no el botón de deshacer. */}
      {onDeshacer && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2">
          <BotonAccion
            onClick={onDeshacer}
            etiqueta="Deshacer el último swipe"
            color="var(--color-rewind)"
            tam="chico"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M7 10H3V6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3.5 14a9 9 0 1 0 2.2-8.8L3 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </BotonAccion>
        </div>
      )}

      <BotonAccion
        onClick={onPass}
        etiqueta="Pasar"
        color="var(--color-nope)"
        tam="grande"
        deshabilitado={deshabilitado}
      >
        <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6L6 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </BotonAccion>

      <BotonAccion
        onClick={onLike}
        etiqueta={etiquetaLike}
        color="var(--color-like)"
        tam="grande"
        deshabilitado={deshabilitado || likeBloqueado}
      >
        <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
          <path
            d="M12 20.5C6 16 3 12.5 3 9a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1c0 3.5-3 7-9 11.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </BotonAccion>
    </div>
  )
}

interface BotonAccionProps {
  onClick: () => void
  etiqueta: string
  color: string
  tam: 'chico' | 'grande'
  deshabilitado?: boolean
  children: React.ReactNode
}

function BotonAccion({
  onClick,
  etiqueta,
  color,
  tam,
  deshabilitado = false,
  children,
}: BotonAccionProps) {
  const medida = tam === 'grande' ? 'w-16 h-16' : 'w-12 h-12'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      aria-label={etiqueta}
      style={{ color, borderColor: color }}
      className={[
        medida,
        'grid place-items-center rounded-full border-2 bg-papel sombra-boton',
        'transition-transform duration-150 active:scale-90',
        'disabled:opacity-30 disabled:pointer-events-none',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
