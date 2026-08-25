import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'

interface ValorToast {
  /** Un aviso corto y de paso, tipo "Listo, guardado." Se apaga solo. */
  mostrar: (mensaje: string) => void
}

const Ctx = createContext<ValorToast | null>(null)

const DURACION_MS = 2600

/**
 * Toast global, uno solo a la vez. Existe para confirmaciones que no vale la
 * pena dejar como texto fijo en la pantalla (como "Listo, guardado." al
 * fondo de un formulario largo, que con la pantalla scrolleada nadie llega
 * a ver). Para errores que hay que leer con calma, `<Aviso>` sigue siendo
 * mejor: ese no se va solo.
 */
export function ProveedorToast({ children }: { children: ReactNode }) {
  const [mensaje, setMensaje] = useState('')
  const [visible, setVisible] = useState(false)
  // Para que un toast nuevo no lo apague uno viejo que llega tarde.
  const idVigente = useRef(0)

  const mostrar = useCallback((texto: string) => {
    const id = ++idVigente.current
    setMensaje(texto)
    setVisible(true)
    setTimeout(() => {
      if (idVigente.current === id) setVisible(false)
    }, DURACION_MS)
  }, [])

  return (
    <Ctx.Provider value={{ mostrar }}>
      {children}
      <div
        aria-live="polite"
        className="fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-6 pointer-events-none"
      >
        <p
          className={[
            'max-w-[448px] px-4 py-3 rounded-chip bg-tinta text-papel text-sm font-medium text-center',
            'transition-opacity duration-300',
            visible ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          {mensaje}
        </p>
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): ValorToast {
  const v = useContext(Ctx)
  if (!v) throw new Error('useToast tiene que usarse dentro de <ProveedorToast>')
  return v
}
