import { NavLink } from 'react-router-dom'

interface Tab {
  a: string
  etiqueta: string
  icono: React.ReactNode
}

/* Iconos en línea: son cuatro trazos, no justifica una dependencia entera. */
const trazo = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const TABS: Tab[] = [
  {
    a: '/mazo',
    etiqueta: 'Mazo',
    icono: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <rect x="6" y="4" width="12" height="16" rx="2" {...trazo} />
        <path d="M3.5 7.5v9" {...trazo} />
        <path d="M20.5 7.5v9" {...trazo} />
      </svg>
    ),
  },
  {
    a: '/matches',
    etiqueta: 'Matches',
    icono: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M4 17V8a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H8l-4 3Z" {...trazo} />
      </svg>
    ),
  },
  {
    a: '/perfil',
    etiqueta: 'Perfil',
    icono: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <circle cx="12" cy="8.5" r="3.5" {...trazo} />
        <path d="M5 20a7 7 0 0 1 14 0" {...trazo} />
      </svg>
    ),
  },
]

export function TabBar({ sinLeer = 0 }: { sinLeer?: number }) {
  return (
    <nav
      aria-label="Secciones"
      className="shrink-0 border-t border-lapiz bg-papel pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {TABS.map((tab) => (
          <li key={tab.a} className="flex-1">
            <NavLink
              to={tab.a}
              className={({ isActive }) =>
                [
                  'relative flex flex-col items-center justify-center gap-1 min-h-14 py-2',
                  isActive ? 'text-tinta' : 'text-grafito',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {tab.icono}
                  <span className="dato">{tab.etiqueta}</span>
                  {tab.a === '/matches' && sinLeer > 0 && (
                    <span
                      className="absolute top-1.5 right-[calc(50%-1.5rem)] min-w-4 h-4 px-1 rounded-full bg-tinta text-papel font-mono text-[0.625rem] leading-4 text-center tabular"
                      aria-label={`${sinLeer} sin leer`}
                    >
                      {sinLeer > 9 ? '9+' : sinLeer}
                    </span>
                  )}
                  {/* Subrayado de resaltador en la pestaña activa. */}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-[var(--acento)]"
                    />
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
