import { useId } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'

const base =
  'w-full min-h-12 px-3.5 bg-transparent border border-lapiz rounded-chip ' +
  'text-tinta placeholder:text-grafito/60 ' +
  // 16px reales: por debajo de eso iOS hace zoom al enfocar el input y
  // descoloca todo el shell.
  'text-base ' +
  'focus:border-tinta focus:outline-none focus-visible:outline-3 focus-visible:outline-tinta'

interface Envoltorio {
  etiqueta: string
  ayuda?: string
  error?: string
  children: (id: string, describedBy: string | undefined) => ReactNode
}

function Envuelto({ etiqueta, ayuda, error, children }: Envoltorio) {
  const id = useId()
  const idAyuda = ayuda || error ? `${id}-ayuda` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="dato text-grafito">
        {etiqueta}
      </label>
      {children(id, idAyuda)}
      {(ayuda || error) && (
        <p
          id={idAyuda}
          className={`text-sm ${error ? 'text-tinta font-medium' : 'text-grafito'}`}
          role={error ? 'alert' : undefined}
        >
          {error ?? ayuda}
        </p>
      )}
    </div>
  )
}

type PropsTexto = InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string
  ayuda?: string
  error?: string
}

export function CampoTexto({ etiqueta, ayuda, error, ...rest }: PropsTexto) {
  return (
    <Envuelto etiqueta={etiqueta} ayuda={ayuda} error={error}>
      {(id, describedBy) => (
        <input
          {...rest}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={base}
        />
      )}
    </Envuelto>
  )
}

type PropsArea = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  etiqueta: string
  ayuda?: string
  error?: string
}

export function CampoArea({ etiqueta, ayuda, error, ...rest }: PropsArea) {
  return (
    <Envuelto etiqueta={etiqueta} ayuda={ayuda} error={error}>
      {(id, describedBy) => (
        <textarea
          {...rest}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={`${base} py-3 resize-none leading-relaxed`}
        />
      )}
    </Envuelto>
  )
}

type PropsSelect = SelectHTMLAttributes<HTMLSelectElement> & {
  etiqueta: string
  ayuda?: string
  error?: string
}

export function CampoSelect({ etiqueta, ayuda, error, children, ...rest }: PropsSelect) {
  return (
    <Envuelto etiqueta={etiqueta} ayuda={ayuda} error={error}>
      {(id, describedBy) => (
        <select {...rest} id={id} aria-describedby={describedBy} className={base}>
          {children}
        </select>
      )}
    </Envuelto>
  )
}
