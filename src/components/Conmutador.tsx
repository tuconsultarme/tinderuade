import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { INTENCIONES } from '@/lib/intenciones'
import type { Intencion } from '@/lib/tipos'
import { useMovimientoReducido } from '@/hooks/useMovimientoReducido'

interface Props {
  modo: Intencion
  onCambio: (m: Intencion) => void
  /** Id del panel que controla, para la relación aria de las pestañas. */
  panelId: string
}

/**
 * EL CONMUTADOR — elemento firma de la app.
 *
 * Un selector físico de tres posiciones, siempre visible arriba del mazo. No es
 * un chip de filtro: es el interruptor que define en qué app estás. Moverlo
 * cambia el acento de toda la interfaz, recompone la card con Flip y recarga
 * el mazo con los candidatos de esa intención.
 *
 * Es un tablist de verdad y no tres botones sueltos: con teclado se recorre con
 * las flechas y un solo tab lo saltea entero, que es como se espera que
 * funcione un selector de vistas.
 */
export function Conmutador({ modo, onCambio, panelId }: Props) {
  const pista = useRef<HTMLDivElement>(null)
  const pastilla = useRef<HTMLSpanElement>(null)
  const botones = useRef<(HTMLButtonElement | null)[]>([])
  const reducido = useMovimientoReducido()

  const indice = INTENCIONES.findIndex((i) => i.id === modo)

  // La pastilla se posiciona midiendo el botón activo en vez de con un
  // translateX del 33%: las tres etiquetas no miden lo mismo y con porcentajes
  // quedaba corrida.
  useEffect(() => {
    const activo = botones.current[indice]
    const contenedor = pista.current
    const marca = pastilla.current
    if (!activo || !contenedor || !marca) return

    const destino = {
      x: activo.offsetLeft,
      width: activo.offsetWidth,
    }

    const ctx = gsap.context(() => {
      gsap.to(marca, {
        ...destino,
        duration: reducido ? 0 : 0.42,
        ease: 'expo.out',
      })
    }, contenedor)

    return () => ctx.revert()
  }, [indice, reducido])

  // Reposicionar cuando cambian las medidas.
  //
  // Observa los botones y no solo el contenedor: el caso que importa es la
  // carga de la tipografía. Con `display=swap`, el primer render mide los tabs
  // con la fuente de respaldo y, cuando entra DM Mono, cambian de ancho. El
  // contenedor sigue midiendo lo mismo (es de ancho completo), así que
  // observarlo a él no alcanza y la pastilla queda corrida hasta el próximo
  // click.
  useEffect(() => {
    const marca = pastilla.current
    if (!marca) return

    const recolocar = () => {
      const activo = botones.current[indice]
      if (!activo) return
      gsap.set(marca, { x: activo.offsetLeft, width: activo.offsetWidth })
    }

    const ro = new ResizeObserver(recolocar)
    for (const b of botones.current) if (b) ro.observe(b)
    if (pista.current) ro.observe(pista.current)

    // Red de seguridad por si el swap de fuente no dispara el observer.
    void document.fonts?.ready.then(recolocar)

    return () => ro.disconnect()
  }, [indice])

  function alTeclado(e: React.KeyboardEvent) {
    let siguiente: number | null = null
    if (e.key === 'ArrowRight') siguiente = (indice + 1) % INTENCIONES.length
    if (e.key === 'ArrowLeft') siguiente = (indice - 1 + INTENCIONES.length) % INTENCIONES.length
    if (e.key === 'Home') siguiente = 0
    if (e.key === 'End') siguiente = INTENCIONES.length - 1
    if (siguiente === null) return

    e.preventDefault()
    onCambio(INTENCIONES[siguiente].id)
    botones.current[siguiente]?.focus()
  }

  return (
    <div
      ref={pista}
      role="tablist"
      aria-label="Con qué intención estás mirando"
      onKeyDown={alTeclado}
      className="relative flex items-stretch p-1 mx-4 bg-lapiz/70 rounded-full select-none"
    >
      <span
        ref={pastilla}
        aria-hidden="true"
        className="absolute top-1 bottom-1 left-0 rounded-full gradiente sombra-boton pointer-events-none"
      />

      {INTENCIONES.map((intencion, i) => {
        const activo = intencion.id === modo
        return (
          <button
            key={intencion.id}
            ref={(el) => {
              botones.current[i] = el
            }}
            role="tab"
            type="button"
            aria-selected={activo}
            aria-controls={panelId}
            tabIndex={activo ? 0 : -1}
            onClick={() => onCambio(intencion.id)}
            className={[
              'relative flex-1 min-h-9 px-2 rounded-full',
              'text-xs font-bold uppercase tracking-wide',
              'transition-colors duration-200',
              activo ? 'text-papel-fija' : 'text-grafito',
            ].join(' ')}
          >
            {intencion.etiqueta}
          </button>
        )
      })}
    </div>
  )
}
