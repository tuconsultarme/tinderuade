import { useEffect, useLayoutEffect, useRef, useState, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { Conmutador } from '@/components/Conmutador'
import { CardPerfil } from '@/components/mazo/CardPerfil'
import { Acciones } from '@/components/mazo/Acciones'
import { MatchOverlay } from '@/components/MatchOverlay'
import { Cargando, Vacio, Aviso } from '@/components/ui/Estados'
import { Boton } from '@/components/ui/Boton'
import { useModo } from '@/context/ModoContext'
import { usePlan } from '@/context/PlanContext'
import { useToast } from '@/components/ui/Toast'
import { useMazo } from '@/hooks/useMazo'
import { useArrastre } from '@/hooks/useArrastre'
import { useMovimientoReducido } from '@/hooks/useMovimientoReducido'
import { definicion } from '@/lib/intenciones'
import { likesRestantes, registrarLikeHoy } from '@/lib/planes'
import type { CandidatoConFotos, DireccionSwipe, Intencion } from '@/lib/tipos'

gsap.registerPlugin(Flip)

interface MatchNuevo {
  matchId: string
  candidato: CandidatoConFotos
  intencion: Intencion
}

export function Mazo() {
  const { modo, setModo } = useModo()
  const { candidatos, cargando, error, swipear, hayParaDeshacer, deshacer, recargar } =
    useMazo(modo)
  const { capacidades, plan } = usePlan()
  const { mostrar } = useToast()
  const reducido = useMovimientoReducido()
  const navegar = useNavigate()
  const panelId = useId()

  const [match, setMatch] = useState<MatchNuevo | null>(null)
  // Likes que quedan hoy (null = ilimitado). Solo aplica al plan gratis.
  const [likesHoy, setLikesHoy] = useState<number | null>(() => likesRestantes(plan))
  useEffect(() => setLikesHoy(likesRestantes(plan)), [plan])
  const estadoFlip = useRef<Flip.FlipState | null>(null)

  const arriba = candidatos[0] ?? null
  const siguiente = candidatos[1] ?? null
  const likeBloqueado = !capacidades.likesIlimitados && (likesHoy ?? 0) <= 0

  const { card, capaLike, capaPass, resolverConBoton } = useArrastre({
    onResolver: (direccion) => void resolver(direccion),
    deshabilitado: !arriba || Boolean(match),
    reducido,
    permitirLike: () => capacidades.likesIlimitados || (likesHoy ?? 0) > 0,
    onLikeBloqueado: () =>
      mostrar('Llegaste al límite de likes de hoy. Pasate a Plus para tener likes ilimitados.'),
  })

  async function resolver(direccion: DireccionSwipe) {
    if (!arriba) return
    const candidato = arriba
    // El like ya pasó el filtro de useArrastre; acá se descuenta del cupo diario.
    if (direccion === 'like' && !capacidades.likesIlimitados) {
      registrarLikeHoy()
      setLikesHoy(likesRestantes(plan))
    }
    const matchId = await swipear(candidato, direccion)
    if (matchId) setMatch({ matchId, candidato, intencion: modo })
  }

  /**
   * El conmutador captura la posición actual ANTES de que React vuelva a
   * renderizar, y el useLayoutEffect de abajo anima desde ahí. Es el orden que
   * pide Flip: medir, cambiar, animar.
   */
  function cambiarModo(nuevo: Intencion) {
    if (nuevo === modo) return
    if (!reducido) {
      estadoFlip.current = Flip.getState('[data-flip-id]')
    }
    setModo(nuevo)
  }

  useLayoutEffect(() => {
    const estado = estadoFlip.current
    if (!estado) return
    estadoFlip.current = null

    Flip.from(estado, {
      duration: 0.55,
      ease: 'expo.out',
      // scale en vez de width/height: animar layout dispara reflow por frame y
      // se cae de los 60fps en un celular de gama media.
      scale: true,
      nested: true,
      absolute: true,
    })
  }, [modo])

  const def = definicion(modo)

  return (
    <div className="h-full flex flex-col">
      <header className="shrink-0 pt-3 pb-2">
        <h1 className="sr-only">UADencuentros — {def.titulo}</h1>
        <Conmutador modo={modo} onCambio={cambiarModo} panelId={panelId} />
      </header>

      <section
        id={panelId}
        role="tabpanel"
        aria-label={def.titulo}
        className="flex-1 min-h-0 flex flex-col"
      >
        {error && (
          <div className="px-4 pb-2">
            <Aviso>No se pudo cargar el mazo. {error}</Aviso>
          </div>
        )}

        <div className="relative flex-1 min-h-0 mx-4 my-2">
          {cargando && candidatos.length === 0 && <Cargando texto="Buscando gente" />}

          {!cargando && !arriba && (
            <Vacio
              titulo="Por ahora, nadie más"
              detalle={def.vacio}
              accion={
                <Boton variante="fantasma" onClick={recargar}>
                  Volver a buscar
                </Boton>
              }
            />
          )}

          {/* La card de atrás da sensación de pila. No es interactiva y queda
              apenas escalada: si se ve entera, distrae del gesto. */}
          {siguiente && (
            <div
              aria-hidden="true"
              className="absolute inset-0 scale-[0.96] origin-bottom opacity-70 pointer-events-none"
            >
              <div className="absolute inset-0 bg-papel border border-lapiz rounded-card sombra-card" />
            </div>
          )}

          {arriba && (
            <CardPerfil
              key={arriba.id}
              ref={card}
              candidato={arriba}
              modo={modo}
              refLike={capaLike}
              refPass={capaPass}
              onAbrir={() => navegar(`/perfil/${arriba.id}`)}
            />
          )}
        </div>

        {/* Sin card arriba (mazo vacío o cargando) no hay nada que resolver:
            los botones desaparecen y queda solo el mensaje de "nadie más". */}
        {arriba && (
          <>
            {!capacidades.likesIlimitados && (
              <p className="text-center text-xs text-grafito">
                {(likesHoy ?? 0) > 0
                  ? `Te quedan ${likesHoy} likes hoy`
                  : 'Te quedaste sin likes hoy · pasate a Plus'}
              </p>
            )}
            <Acciones
              deshabilitado={Boolean(match)}
              likeBloqueado={likeBloqueado}
              etiquetaLike={def.like}
              onPass={() => resolverConBoton('pass')}
              onLike={() => resolverConBoton('like')}
              onDeshacer={hayParaDeshacer && !match && capacidades.puedeDeshacer ? () => void deshacer() : undefined}
            />
          </>
        )}
      </section>

      {match && (
        <MatchOverlay
          nombre={match.candidato.nombre}
          foto={match.candidato.fotos[0] ?? null}
          intencion={match.intencion}
          onChatear={() => {
            setMatch(null)
            navegar(`/chat/${match.matchId}`)
          }}
          onSeguir={() => setMatch(null)}
        />
      )}
    </div>
  )
}
