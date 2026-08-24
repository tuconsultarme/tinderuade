import type { ReactNode } from 'react'

/** Spinner sobrio: un trazo de tinta girando. Sin logo animado. */
export function Cargando({ texto = 'Cargando' }: { texto?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12" role="status">
      <span
        className="block w-6 h-6 rounded-full border-2 border-lapiz border-t-tinta animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
      <span className="dato text-grafito">{texto}</span>
    </div>
  )
}

export function Vacio({ titulo, detalle, accion }: { titulo: string; detalle?: string; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <h2 className="text-2xl">{titulo}</h2>
      {detalle && <p className="text-grafito text-balance">{detalle}</p>}
      {accion}
    </div>
  )
}

export function Aviso({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="px-3.5 py-3 rounded-chip border border-tinta bg-tinta/5 text-sm font-medium"
    >
      {children}
    </p>
  )
}
