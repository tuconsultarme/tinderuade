import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

type Variante = 'acento' | 'tinta' | 'fantasma'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  ancho?: boolean
  children: ReactNode
  /** React 19 pasa ref como prop común, sin forwardRef. */
  ref?: Ref<HTMLButtonElement>
}

/**
 * Píldora al estilo Tinder. El primario `acento` va con el gradiente firma y
 * una sombra suave; `fantasma` es un contorno para acciones secundarias.
 */
const estilos: Record<Variante, string> = {
  acento: 'gradiente text-papel-fija sombra-boton',
  tinta: 'bg-tinta text-papel',
  fantasma: 'bg-transparent text-grafito border-2 border-lapiz',
}

export function Boton({ variante = 'acento', ancho = false, className = '', children, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={[
        'min-h-13 px-6 rounded-full font-bold uppercase tracking-wide text-sm',
        // active:scale en vez de hover: en mobile el hover no existe y queda
        // un estado pegado después del tap.
        'transition-transform duration-150 active:scale-[0.97]',
        'disabled:opacity-40 disabled:pointer-events-none',
        estilos[variante],
        ancho ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}
