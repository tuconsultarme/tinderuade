import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useMovimientoReducido } from '@/hooks/useMovimientoReducido'
import { definicion } from '@/lib/intenciones'
import type { Intencion } from '@/lib/tipos'

interface Props {
  nombre: string
  foto: string | null
  intencion: Intencion
  onChatear: () => void
  onSeguir: () => void
}

/**
 * El único momento con coreografía completa de la app.
 *
 * Se ve poco —solo cuando hay match— así que puede permitirse ser generoso sin
 * volverse cargoso. El resto de la app se mantiene disciplinado justamente para
 * que esto pegue.
 */
export function MatchOverlay({ nombre, foto, intencion, onChatear, onSeguir }: Props) {
  const raiz = useRef<HTMLDivElement>(null)
  const cerrar = useRef<HTMLButtonElement>(null)
  const reducido = useMovimientoReducido()

  useEffect(() => {
    // El foco entra al overlay para que con teclado y lector de pantalla no se
    // siga navegando el mazo que quedó detrás.
    cerrar.current?.focus()

    const ctx = gsap.context(() => {
      if (reducido) {
        gsap.set('[data-anim]', { opacity: 1, y: 0, scale: 1 })
        return
      }

      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      tl.from(raiz.current, { opacity: 0, duration: 0.25, ease: 'none' })
        .from('[data-anim="franja"]', { scaleX: 0, duration: 0.5, transformOrigin: 'left center' })
        .from('[data-anim="titulo"]', { y: 40, opacity: 0, duration: 0.55 }, '-=0.28')
        .from('[data-anim="foto"]', { scale: 0.82, opacity: 0, duration: 0.5 }, '-=0.4')
        .from('[data-anim="nombre"]', { y: 18, opacity: 0, duration: 0.4 }, '-=0.32')
        .from('[data-anim="acciones"] > *', { y: 16, opacity: 0, duration: 0.35, stagger: 0.07 }, '-=0.2')
    }, raiz)

    return () => ctx.revert()
  }, [reducido])

  function alTeclado(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onSeguir()
  }

  return (
    <div
      ref={raiz}
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-match"
      onKeyDown={alTeclado}
      className="fixed inset-0 z-50 gradiente flex flex-col items-center justify-center gap-6 px-8"
    >
      <span
        data-anim="franja"
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-1.5 bg-papel-fija/40"
      />

      <h2
        id="titulo-match"
        data-anim="titulo"
        className="text-[clamp(2.75rem,15vw,4.5rem)] text-center italic font-extrabold text-papel-fija"
      >
        ¡Es un match!
      </h2>

      <div
        data-anim="foto"
        className="w-40 h-40 rounded-full overflow-hidden border-4 border-papel-fija bg-papel-fija/20 grid place-items-center sombra-card"
      >
        {foto ? (
          <img src={foto} alt={`Foto de ${nombre}`} className="w-full h-full object-cover" />
        ) : (
          <span className="dato text-papel-fija/80">Sin foto</span>
        )}
      </div>

      <p data-anim="nombre" className="text-center text-balance text-papel-fija">
        <span className="text-xl font-bold">{nombre}</span>
        <span className="block mt-2 text-papel-fija/85">{definicion(intencion).match}</span>
      </p>

      <div data-anim="acciones" className="w-full max-w-xs flex flex-col gap-3">
        <button
          type="button"
          onClick={onChatear}
          className="min-h-13 px-6 rounded-full font-bold uppercase tracking-wide text-sm bg-papel-fija text-[var(--grad-1)] transition-transform duration-150 active:scale-[0.97]"
        >
          Mandarle un mensaje
        </button>
        <button
          ref={cerrar}
          type="button"
          onClick={onSeguir}
          className="min-h-13 px-6 rounded-full font-bold uppercase tracking-wide text-sm border-2 border-papel-fija/70 text-papel-fija transition-transform duration-150 active:scale-[0.97]"
        >
          Seguir mirando
        </button>
      </div>
    </div>
  )
}
