import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import type { DireccionSwipe } from '@/lib/tipos'

interface Opciones {
  onResolver: (direccion: DireccionSwipe) => void
  deshabilitado?: boolean
  reducido?: boolean
}

/** A partir de acá el gesto cuenta como decisión, medido sobre el ancho de la card. */
const UMBRAL_DISTANCIA = 0.3
/** px/ms. Un flick corto pero rápido también decide, sin llegar al umbral. */
const UMBRAL_VELOCIDAD = 0.45
const ROTACION_MAX = 14

/**
 * Arrastre de la card del mazo.
 *
 * Todo el movimiento va por manipulación directa del DOM con GSAP, sin estado
 * de React: un setState por cada pointermove haría re-renderizar el árbol
 * entero sesenta veces por segundo y el gesto se sentiría pegajoso.
 *
 * Solo se animan `transform` y `opacity`.
 */
export function useArrastre({ onResolver, deshabilitado = false, reducido = false }: Opciones) {
  const card = useRef<HTMLDivElement>(null)
  /** Capa de resaltador fluo que crece al arrastrar a la derecha. */
  const capaLike = useRef<HTMLDivElement>(null)
  /** Capa del tachón de tinta que crece al arrastrar a la izquierda. */
  const capaPass = useRef<HTMLDivElement>(null)

  // En refs y no en estado: los lee el handler de pointermove y no tienen que
  // provocar re-render ni recrear los listeners.
  const resolver = useRef(onResolver)
  const bloqueado = useRef(deshabilitado)

  // Sin array de dependencias: se sincroniza después de cada render. Va en un
  // efecto y no en el cuerpo del hook porque escribir un ref durante el render
  // no es seguro con el renderizado concurrente de React.
  useEffect(() => {
    resolver.current = onResolver
    bloqueado.current = deshabilitado
  })

  useEffect(() => {
    const el = card.current
    if (!el) return

    // Capturados acá y no leídos en el cleanup: para cuando el cleanup corre,
    // los refs pueden apuntar ya a otra card.
    const like = capaLike.current
    const pass = capaPass.current

    let arrastrando = false
    let inicioX = 0
    let inicioY = 0
    let ultimoX = 0
    let ultimoT = 0
    let velocidad = 0
    let pointerId = -1

    const setX = gsap.quickSetter(el, 'x', 'px')
    const setY = gsap.quickSetter(el, 'y', 'px')
    const setRot = gsap.quickSetter(el, 'rotation', 'deg')
    const setLike = gsap.quickSetter(like, 'opacity')
    const setPass = gsap.quickSetter(pass, 'opacity')

    function pintar(dx: number, dy: number) {
      const ancho = el!.offsetWidth || 1
      const avance = gsap.utils.clamp(-1, 1, dx / (ancho * UMBRAL_DISTANCIA))

      setX(dx)
      setY(dy)
      if (!reducido) setRot(avance * ROTACION_MAX)

      // Resaltar a la derecha, tachar a la izquierda. Nunca las dos a la vez.
      setLike(Math.max(0, avance))
      setPass(Math.max(0, -avance))
    }

    function alBajar(e: PointerEvent) {
      if (bloqueado.current || arrastrando) return
      arrastrando = true
      pointerId = e.pointerId
      inicioX = e.clientX
      inicioY = e.clientY
      ultimoX = e.clientX
      ultimoT = e.timeStamp
      velocidad = 0

      el!.setPointerCapture(pointerId)
      // Avisar al compositor recién cuando empieza el gesto, no de entrada:
      // dejar will-change puesto en reposo consume memoria de GPU al pedo.
      gsap.set(el, { willChange: 'transform' })
    }

    function alMover(e: PointerEvent) {
      if (!arrastrando || e.pointerId !== pointerId) return

      const dt = e.timeStamp - ultimoT
      if (dt > 0) {
        velocidad = (e.clientX - ultimoX) / dt
        ultimoX = e.clientX
        ultimoT = e.timeStamp
      }

      const dx = e.clientX - inicioX
      // El eje vertical acompaña amortiguado: sin esto la card se despega del
      // dedo, con seguimiento 1:1 se va de la pantalla al hacer scroll.
      const dy = (e.clientY - inicioY) * 0.35
      pintar(dx, dy)
    }

    function alSoltar(e: PointerEvent) {
      if (!arrastrando || e.pointerId !== pointerId) return
      arrastrando = false
      if (el!.hasPointerCapture(pointerId)) el!.releasePointerCapture(pointerId)

      const dx = e.clientX - inicioX
      const ancho = el!.offsetWidth || 1
      const paso = Math.abs(dx) > ancho * UMBRAL_DISTANCIA
      const flick = Math.abs(velocidad) > UMBRAL_VELOCIDAD && Math.abs(dx) > 24
      // Un flick manda en su propia dirección aunque el dedo haya vuelto atrás.
      const haciaDerecha = paso ? dx > 0 : velocidad > 0

      if (paso || flick) {
        volar(haciaDerecha ? 'like' : 'pass')
      } else {
        regresar()
      }
    }

    function volar(direccion: DireccionSwipe) {
      const salida = (direccion === 'like' ? 1 : -1) * (window.innerWidth + 200)
      gsap.to(el, {
        x: salida,
        rotation: reducido ? 0 : (direccion === 'like' ? 1 : -1) * 22,
        opacity: 0,
        duration: reducido ? 0.12 : 0.34,
        ease: 'power2.in',
        onComplete: () => {
          gsap.set(el, { willChange: 'auto' })
          resolver.current(direccion)
        },
      })
    }

    function regresar() {
      gsap.to(el, {
        x: 0,
        y: 0,
        rotation: 0,
        duration: reducido ? 0 : 0.55,
        ease: 'elastic.out(1, 0.62)',
        onComplete: () => gsap.set(el, { willChange: 'auto' }),
      })
      gsap.to([like, pass], {
        opacity: 0,
        duration: reducido ? 0 : 0.25,
      })
    }

    el.addEventListener('pointerdown', alBajar)
    el.addEventListener('pointermove', alMover)
    el.addEventListener('pointerup', alSoltar)
    el.addEventListener('pointercancel', alSoltar)

    return () => {
      el.removeEventListener('pointerdown', alBajar)
      el.removeEventListener('pointermove', alMover)
      el.removeEventListener('pointerup', alSoltar)
      el.removeEventListener('pointercancel', alSoltar)
      gsap.killTweensOf(el)
      gsap.killTweensOf([like, pass])
    }
  }, [reducido])

  /** Dispara la salida desde los botones, no desde el dedo. */
  function resolverConBoton(direccion: DireccionSwipe) {
    const el = card.current
    if (!el || bloqueado.current) return

    const capa = direccion === 'like' ? capaLike.current : capaPass.current
    const tl = gsap.timeline()
    // Se marca primero y recién después se va: si vuela de una, el gesto se
    // lee como "desapareció" en vez de "la resalté".
    tl.to(capa, { opacity: 1, duration: reducido ? 0 : 0.14 })
    tl.to(
      el,
      {
        x: (direccion === 'like' ? 1 : -1) * (window.innerWidth + 200),
        rotation: reducido ? 0 : (direccion === 'like' ? 1 : -1) * 22,
        opacity: 0,
        duration: reducido ? 0.12 : 0.34,
        ease: 'power2.in',
        onComplete: () => resolver.current(direccion),
      },
      reducido ? 0 : '-=0.04',
    )
  }

  return { card, capaLike, capaPass, resolverConBoton }
}
