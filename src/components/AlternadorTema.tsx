import { useEffect, useState } from 'react'

type Tema = 'claro' | 'oscuro'

/** Lee la preferencia guardada; por defecto, oscuro (el look de la casa). */
function temaInicial(): Tema {
  if (typeof localStorage !== 'undefined' && localStorage.getItem('tema') === 'claro') {
    return 'claro'
  }
  return 'oscuro'
}

/**
 * Interruptor sol/luna. Cambia entre modo noche (oscuro) y día (claro)
 * poniendo data-tema en <html>, que es lo que leen los tokens del CSS.
 * La elección se guarda para la próxima visita.
 */
export function AlternadorTema() {
  const [tema, setTema] = useState<Tema>(temaInicial)

  useEffect(() => {
    document.documentElement.dataset.tema = tema === 'claro' ? 'light' : 'dark'
    localStorage.setItem('tema', tema)
  }, [tema])

  const esOscuro = tema === 'oscuro'

  return (
    <button
      type="button"
      onClick={() => setTema(esOscuro ? 'claro' : 'oscuro')}
      aria-label={esOscuro ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
      className="grid place-items-center w-10 h-10 rounded-full border border-lapiz bg-papel/60 text-tinta backdrop-blur-sm transition-transform duration-150 active:scale-90"
    >
      {esOscuro ? (
        // Sol: tocar para pasar a día.
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
          </g>
        </svg>
      ) : (
        // Luna: tocar para pasar a noche.
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}
