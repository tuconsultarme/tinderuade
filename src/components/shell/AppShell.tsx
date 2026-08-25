import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { TabBar } from './TabBar'
import { MenuHamburguesa } from '@/components/MenuHamburguesa'
import { AlternadorTema } from '@/components/AlternadorTema'

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
 */
export function AppShell({ children, sinLeer = 0, scroll = true }: Props) {
  return (
    <div className="h-[100dvh] w-full flex justify-center bg-papel">
      <div className="relative w-full max-w-[480px] h-full flex flex-col border-x border-lapiz">
        <header className="shrink-0 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 pt-2 pb-1">
          <span aria-hidden="true" />
          <Link
            to="/mazo"
            aria-label="Ir al inicio"
            className="justify-self-center text-base font-extrabold resaltado px-1.5"
          >
            UADencuentros
          </Link>
          <div className="justify-self-end flex items-center gap-2">
            <AlternadorTema />
            <MenuHamburguesa />
          </div>
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
      <div className="w-full max-w-[480px] h-full flex flex-col border-x border-lapiz">
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
