import type { ReactNode } from 'react'
import { TabBar } from './TabBar'
import { MenuHamburguesa } from '@/components/MenuHamburguesa'

interface Props {
  children: ReactNode
  sinLeer?: number
  /** El mazo no scrollea: la card ocupa el alto disponible y punto. */
  scroll?: boolean
}

/**
 * Shell de app, no de página web.
 *
 * - `100dvh` y no `100vh`: en el celular la barra del navegador aparece y
 *   desaparece, y con vh la tab bar queda tapada o flotando.
 * - El body no scrollea nunca (ver index.css); scrollea solo el <main>.
 * - Ancho tope de 480px y centrado para que en la compu se vea como el
 *   celular al que está diseñada, en vez de una card estirada a 1920px.
 *
 * COLUMNA-ANCLA: la columna lleva un `transform` que no mueve nada
 * (translateZ(0)). Está puesto a propósito: un ancestro con transform pasa a
 * ser el bloque contenedor de todo `position: fixed` que cuelgue de él. Sin
 * eso, el menú lateral, el overlay de match, los toasts y el visor de fotos
 * del chat se anclan al viewport del navegador y en una pantalla ancha
 * aparecen fuera de la columna, flotando en el negro de los costados.
 *
 * Se resuelve así y no cambiando cada overlay a `absolute` porque varios viven
 * dentro de <main>, que recorta con overflow: en absolute quedarían cortados,
 * y en fixed con esta ancla escapan del recorte pero respetan la columna.
 *
 * El `overflow-hidden` de la columna es la otra mitad del arreglo: el menú
 * lateral cerrado se corre a su propia derecha con translate-x-full, y sin
 * recorte queda pintado en el negro del costado. La columna hace de borde de
 * pantalla, igual que el marco de un celular.
 */
export function AppShell({ children, sinLeer = 0, scroll = true }: Props) {
  return (
    <div className="h-[100dvh] w-full flex justify-center bg-papel">
      <div className="columna-ancla relative w-full max-w-[480px] h-full flex flex-col overflow-hidden border-x border-lapiz">
        <header className="shrink-0 flex items-center justify-end px-3 pt-2 pb-1">
          <MenuHamburguesa />
        </header>
        <main
          className={[
            'flex-1 min-h-0',
            scroll ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden',
          ].join(' ')}
        >
          {children}
        </main>
        <TabBar sinLeer={sinLeer} />
      </div>
    </div>
  )
}

/** Variante sin tab bar, para entrada, onboarding y chat. */
export function ShellPlano({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <div className="h-[100dvh] w-full flex justify-center bg-papel">
      <div className="columna-ancla relative w-full max-w-[480px] h-full flex flex-col overflow-hidden border-x border-lapiz">
        <main
          className={[
            'flex-1 min-h-0 flex flex-col',
            scroll ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden',
          ].join(' ')}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
