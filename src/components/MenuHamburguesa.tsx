import { useEffect, useState } from 'react'
import { AlternadorTema } from './AlternadorTema'
import { useSesion } from '@/context/SesionContext'
import { MODO_DEMO } from '@/lib/demo'

interface Plan {
  nombre: string
  precio: string
  destacado?: boolean
  beneficios: string[]
}

/** Planes de ejemplo — todavía no hay cobros conectados. */
const PLANES: Plan[] = [
  {
    nombre: 'Gratis',
    precio: '$0',
    beneficios: ['Swipes limitados por día', 'Chat con tus matches', 'Las tres lentes'],
  },
  {
    nombre: 'Plus',
    precio: '$2.500 / mes',
    destacado: true,
    beneficios: ['Likes ilimitados', 'Deshacer sin límite', 'Sin publicidad'],
  },
  {
    nombre: 'Gold',
    precio: '$4.900 / mes',
    beneficios: ['Todo lo de Plus', 'Ves quién te dio like', '5 destacados por semana'],
  },
]

/**
 * Menú lateral que se abre desde el botón de hamburguesa de la barra superior.
 * Adentro: Configuración (tema noche/día), Planes y, abajo del todo, Cerrar
 * sesión.
 */
export function MenuHamburguesa() {
  const [abierto, setAbierto] = useState(false)
  const [verPlanes, setVerPlanes] = useState(false)
  const { salir } = useSesion()

  // Cerrar con Escape.
  useEffect(() => {
    if (!abierto) return
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', alTecla)
    return () => window.removeEventListener('keydown', alTecla)
  }, [abierto])

  function cerrar() {
    setAbierto(false)
    setVerPlanes(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú"
        aria-expanded={abierto}
        className="grid place-items-center w-10 h-10 rounded-full border border-lapiz bg-papel/60 text-tinta backdrop-blur-sm transition-transform duration-150 active:scale-90"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Fondo oscurecido */}
      <div
        onClick={cerrar}
        aria-hidden="true"
        className={[
          'fixed inset-0 z-50 bg-black/50 transition-opacity duration-200',
          abierto ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        className={[
          'fixed top-0 right-0 z-50 h-[100dvh] w-[80%] max-w-[320px]',
          'bg-papel border-l border-lapiz flex flex-col',
          'transition-transform duration-300 ease-out',
          abierto ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Encabezado */}
        <div className="shrink-0 flex items-center justify-between px-5 h-16 border-b border-lapiz">
          <span className="text-xl font-extrabold resaltado">
            {verPlanes ? 'Planes' : 'Menú'}
          </span>
          <button
            type="button"
            onClick={verPlanes ? () => setVerPlanes(false) : cerrar}
            aria-label={verPlanes ? 'Volver' : 'Cerrar menú'}
            className="grid place-items-center w-9 h-9 rounded-full text-grafito active:scale-90 transition-transform"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              {verPlanes ? (
                <path
                  d="M15 6l-6 6 6 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {verPlanes ? (
            <ul className="flex flex-col gap-3">
              {PLANES.map((plan) => (
                <li
                  key={plan.nombre}
                  className={[
                    'rounded-2xl p-4',
                    plan.destacado
                      ? 'gradiente text-papel-fija sombra-boton'
                      : 'border border-lapiz',
                  ].join(' ')}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-extrabold">{plan.nombre}</span>
                    <span
                      className={['text-sm font-semibold', plan.destacado ? '' : 'text-grafito'].join(
                        ' ',
                      )}
                    >
                      {plan.precio}
                    </span>
                  </div>
                  <ul
                    className={[
                      'mt-2 flex flex-col gap-1 text-sm',
                      plan.destacado ? 'text-papel-fija/90' : 'text-grafito',
                    ].join(' ')}
                  >
                    {plan.beneficios.map((b) => (
                      <li key={b} className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                          <path
                            d="M5 12l4 4 10-10"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {b}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
              <p className="text-xs text-grafito text-center mt-1">
                Los pagos todavía no están habilitados.
              </p>
            </ul>
          ) : (
            <div className="flex flex-col">
              {/* Configuración */}
              <p className="dato text-grafito mb-2">Configuración</p>
              <div className="flex items-center justify-between py-2">
                <span className="font-semibold">Modo noche / día</span>
                <AlternadorTema />
              </div>

              {/* Planes */}
              <p className="dato text-grafito mt-5 mb-2">Suscripción</p>
              <button
                type="button"
                onClick={() => setVerPlanes(true)}
                className="flex items-center justify-between py-3 text-left"
              >
                <span className="font-semibold">Ver planes</span>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className="text-grafito">
                  <path
                    d="M9 6l6 6-6 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Cerrar sesión, abajo del todo */}
        {!MODO_DEMO && (
          <div className="shrink-0 p-5 border-t border-lapiz">
            <button
              type="button"
              onClick={() => void salir()}
              className="w-full min-h-12 rounded-full border-2 border-lapiz font-bold uppercase tracking-wide text-sm text-[var(--color-nope)] transition-transform duration-150 active:scale-[0.97]"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
