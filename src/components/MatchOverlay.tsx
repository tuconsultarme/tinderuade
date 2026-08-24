import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { Boton } from './ui/Boton'
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
      className="fixed inset-0 z-50 bg-papel flex flex-col items-center justify-center gap-6 px-8"
    >
      <span
        data-anim="franja"
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-2 bg-[var(--acento)]"
      />

      <h2 id="titulo-match" data-anim="titulo" className="text-[clamp(3rem,18vw,5rem)] text-center">
        ¡Match!
      </h2>

      <div
        data-anim="foto"
        className="w-40 h-40 rounded-chip overflow-hidden border-2 border-tinta bg-lapiz/40 grid place-items-center"
      >
        {foto ? (
          <img src={foto} alt={`Foto de ${nombre}`} className="w-full h-full object-cover" />
        ) : (
          <span className="dato text-grafito">Sin foto</span>
        )}
      </div>

      <p data-anim="nombre" className="text-center text-balance">
        <span className="resaltado px-1.5 py-0.5 text-xl font-semibold">{nombre}</span>
        <span className="block mt-2 text-grafito">{definicion(intencion).match}</span>
      </p>

      <div data-anim="acciones" className="w-full max-w-xs flex flex-col gap-2.5">
        <Boton ancho onClick={onChatear}>
          Mandarle un mensaje
        </Boton>
        <Boton ref={cerrar} ancho variante="fantasma" onClick={onSeguir}>
          Seguir mirando
        </Boton>
      </div>
    </div>
  )
}
