import { useEffect, useState } from 'react'

/**
 * Lee `prefers-reduced-motion` y se mantiene al día si la persona lo cambia
 * con la app abierta.
 *
 * En esta app no significa "sin swipe": el arrastre es un gesto, no un adorno,
 * y sacarlo dejaría la pantalla principal sin forma de usarse. Lo que se apaga
 * es la coreografía — rotación de la card, overshoot, la entrada del match.
 */
export function useMovimientoReducido(): boolean {
  const [reducido, setReducido] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const alCambiar = (e: MediaQueryListEvent) => setReducido(e.matches)
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [])

  return reducido
}
