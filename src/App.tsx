import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ProveedorSesion, useSesion } from './context/SesionContext'
import { ProveedorModo } from './context/ModoContext'
import { ProveedorToast } from './components/ui/Toast'
import { AppShell } from './components/shell/AppShell'
import { Cargando } from './components/ui/Estados'
import { useMatches } from './hooks/useMatches'
import { Entrada } from './paginas/Entrada'
import { Privacidad } from './paginas/Privacidad'
import { Onboarding } from './paginas/Onboarding'
import { Mazo } from './paginas/Mazo'
import { Matches } from './paginas/Matches'
import { Chat } from './paginas/Chat'
import { MiPerfil } from './paginas/MiPerfil'
import { PerfilDetalle } from './paginas/PerfilDetalle'

/**
 * Guardián de rutas. Tres estados posibles:
 *   sin sesión            → /entrar
 *   sesión sin onboarding → /onboarding
 *   sesión completa       → la app
 *
 * `cargando` existe para no mandar a /entrar en el primer frame mientras
 * Supabase todavía está leyendo la sesión de localStorage.
 */
function Privado({ children }: { children: ReactNode }) {
  const { sesion, perfil, cargando } = useSesion()
  const ubicacion = useLocation()

  if (cargando) return <Cargando texto="Un momento" />
  if (!sesion) return <Navigate to="/entrar" replace state={{ desde: ubicacion.pathname }} />
  if (!perfil?.onboarding_completo) return <Navigate to="/onboarding" replace />

  return <>{children}</>
}

/** Rutas con tab bar. Vive acá para que el contador de sin leer sea uno solo. */
function ConTabs({ children }: { children: ReactNode }) {
  const { sesion } = useSesion()
  const { sinLeerTotal } = useMatches(sesion?.user.id)
  return <AppShell sinLeer={sinLeerTotal}>{children}</AppShell>
}

/** El mazo no scrollea: la card ocupa exactamente el alto disponible. */
function MazoConTabs() {
  const { sesion } = useSesion()
  const { sinLeerTotal } = useMatches(sesion?.user.id)
  return (
    <AppShell sinLeer={sinLeerTotal} scroll={false}>
      <Mazo />
    </AppShell>
  )
}

function Rutas() {
  const { sesion, perfil, cargando } = useSesion()

  return (
    <Routes>
      {/* Pública siempre, con o sin sesión: hay que poder leerla antes de
          registrarse. */}
      <Route path="/privacidad" element={<Privacidad />} />

      <Route
        path="/entrar"
        element={
          cargando ? (
            <Cargando texto="Un momento" />
          ) : sesion ? (
            <Navigate to="/mazo" replace />
          ) : (
            <Entrada />
          )
        }
      />

      <Route
        path="/onboarding"
        element={
          cargando ? (
            <Cargando texto="Un momento" />
          ) : !sesion ? (
            <Navigate to="/entrar" replace />
          ) : perfil?.onboarding_completo ? (
            <Navigate to="/mazo" replace />
          ) : (
            <Onboarding />
          )
        }
      />

      <Route
        path="/mazo"
        element={
          <Privado>
            <MazoConTabs />
          </Privado>
        }
      />

      <Route
        path="/matches"
        element={
          <Privado>
            <ConTabs>
              <Matches />
            </ConTabs>
          </Privado>
        }
      />

      <Route
        path="/perfil"
        element={
          <Privado>
            <ConTabs>
              <MiPerfil />
            </ConTabs>
          </Privado>
        }
      />

      <Route
        path="/perfil/:perfilId"
        element={
          <Privado>
            <PerfilDetalle />
          </Privado>
        }
      />

      <Route
        path="/chat/:matchId"
        element={
          <Privado>
            <Chat />
          </Privado>
        }
      />

      <Route path="*" element={<Navigate to="/mazo" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ProveedorToast>
        <ProveedorSesion>
          <ProveedorModo>
            <Rutas />
          </ProveedorModo>
        </ProveedorSesion>
      </ProveedorToast>
    </BrowserRouter>
  )
}
