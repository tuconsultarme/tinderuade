interface Props {
  onPass: () => void
  onLike: () => void
  etiquetaLike: string
  deshabilitado?: boolean
  /** Sin cupo diario: se apaga el like pero el pass sigue disponible, porque
   *  descartar no consume nada. */
  likeBloqueado?: boolean
}

/**
 * Los botones bajo el mazo, estilo Tinder: círculos blancos con el ícono y el
 * anillo pintados del color de cada acción, y una sombra suave que los levanta
 * del fondo. Para quien no quiere arrastrar (y para quien navega con teclado).
 *
 * Pasar (rojo) · Me gusta (verde). Una decisión tomada no se vuelve atrás.
 */
export function Acciones({
  onPass,
  onLike,
  etiquetaLike,
  deshabilitado = false,
  likeBloqueado = false,
}: Props) {
  return (
    <div className="shrink-0 flex items-center justify-center gap-6 py-4">
      <BotonAccion
        onClick={onPass}
        etiqueta="Pasar"
        color="var(--color-nope)"
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
        etiqueta={likeBloqueado ? 'Sin likes disponibles hasta mañana' : etiquetaLike}
        color="var(--color-like)"
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
  deshabilitado?: boolean
  children: React.ReactNode
}

function BotonAccion({ onClick, etiqueta, color, deshabilitado = false, children }: BotonAccionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      aria-label={etiqueta}
      style={{ color, borderColor: color }}
      className={[
        'w-16 h-16',
        'grid place-items-center rounded-full border-2 bg-papel sombra-boton',
        'transition-transform duration-150 active:scale-90',
        'disabled:opacity-30 disabled:pointer-events-none',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
