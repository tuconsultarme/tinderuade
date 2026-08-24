interface Props {
  onPass: () => void
  onLike: () => void
  etiquetaLike: string
  deshabilitado?: boolean
}

/**
 * Los dos botones bajo el mazo, para quien no quiere arrastrar (y para quien
 * navega con teclado, que si no se queda sin forma de decidir).
 *
 * Sin verde ni rojo: el like usa el fluo del modo activo y el pass es una cruz
 * de tinta, igual que el feedback del arrastre.
 */
export function Acciones({ onPass, onLike, etiquetaLike, deshabilitado = false }: Props) {
  return (
    <div className="shrink-0 flex items-center justify-center gap-6 py-3">
      <button
        type="button"
        onClick={onPass}
        disabled={deshabilitado}
        aria-label="Pasar"
        className="w-16 h-16 grid place-items-center rounded-full border-2 border-tinta bg-papel text-tinta transition-transform duration-150 active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
      >
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6L6 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <button
        type="button"
        onClick={onLike}
        disabled={deshabilitado}
        aria-label={etiquetaLike}
        className="w-20 h-20 grid place-items-center rounded-full border-2 border-tinta bg-[var(--acento)] text-tinta transition-transform duration-150 active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
      >
        {/* Un trazo de resaltador, no un corazón: el gesto de la app es marcar. */}
        <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
          <path
            d="M5 22.5 L27 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.28"
          />
          <path
            d="M5 22.5 L27 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
