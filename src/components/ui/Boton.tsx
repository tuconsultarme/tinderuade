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
 * Sin sombras y sin gradientes, por la regla del sistema. El peso visual sale
 * del relleno: `acento` es literalmente el resaltador del modo activo.
 */
const estilos: Record<Variante, string> = {
  acento: 'bg-[var(--acento)] text-tinta',
  tinta: 'bg-tinta text-papel',
  fantasma: 'bg-transparent text-tinta border border-lapiz',
}

export function Boton({ variante = 'acento', ancho = false, className = '', children, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={[
        'min-h-12 px-5 rounded-chip font-semibold',
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
