import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { DOMINIO_MAIL_REQUERIDO } from '@/lib/config'
import { ShellPlano } from '@/components/shell/AppShell'
import { AlternadorTema } from '@/components/AlternadorTema'
import { CampoTexto } from '@/components/ui/Campo'
import { Boton } from '@/components/ui/Boton'
import { Aviso } from '@/components/ui/Estados'

type Modo = 'entrar' | 'registro'

export function Entrada() {
  const [modo, setModo] = useState<Modo>('entrar')
  const [mail, setMail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function validar(): string | null {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return 'Ese mail no parece válido.'
    if (DOMINIO_MAIL_REQUERIDO && !mail.toLowerCase().endsWith(`@${DOMINIO_MAIL_REQUERIDO}`)) {
      return `Necesitás un mail @${DOMINIO_MAIL_REQUERIDO}.`
    }
    if (clave.length < 8) return 'La contraseña tiene que tener al menos 8 caracteres.'
    return null
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setAviso(null)

    const problema = validar()
    if (problema) {
      setError(problema)
      return
    }

    setEnviando(true)

    if (modo === 'registro') {
      const { data, error: err } = await supabase.auth.signUp({ email: mail, password: clave })
      setEnviando(false)
      if (err) {
        setError(traducir(err.message))
        return
      }
      // Con confirmación de mail activada en Supabase no viene sesión: hay que
      // avisar en vez de dejar la pantalla como si no hubiera pasado nada.
      if (!data.session) {
        setAviso('Te mandamos un mail para confirmar la cuenta. Abrilo y volvé a entrar.')
      }
      return
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email: mail, password: clave })
    setEnviando(false)
    if (err) setError(traducir(err.message))
    // Si sale bien, el onAuthStateChange del contexto se encarga de rutear.
  }

  return (
    <ShellPlano>
      <div className="flex justify-end px-3 pt-2">
        <AlternadorTema />
      </div>
      <div className="flex-1 flex flex-col justify-center px-6 pb-10 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="grid place-items-center w-11 h-11 rounded-2xl gradiente sombra-boton">
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                <path
                  d="M12 21C6.5 17 4 13.4 4 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 13.4 17.5 17 12 21Z"
                  fill="#fff"
                />
              </svg>
            </span>
            <span className="text-2xl font-extrabold resaltado">UADencuentros</span>
          </div>
          <h1 className="titulo-resaltado text-[clamp(2.25rem,11vw,3.25rem)] font-extrabold">
            Conocé gente
            <br />
            <span className="resaltado">de tu facu.</span>
          </h1>
          <p className="mt-4 text-grafito text-balance">
            Para salir, para hacer amigos o para no rendir solo. Vos elegís con qué intención mirás.
          </p>
        </div>

        <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
          <CampoTexto
            etiqueta="Mail"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={mail}
            onChange={(e) => setMail(e.target.value)}
            placeholder={DOMINIO_MAIL_REQUERIDO ? `nombre@${DOMINIO_MAIL_REQUERIDO}` : 'nombre@mail.com'}
            required
          />

          <CampoTexto
            etiqueta="Contraseña"
            type="password"
            autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            ayuda={modo === 'registro' ? 'Mínimo 8 caracteres.' : undefined}
            required
          />

          {error && <Aviso>{error}</Aviso>}
          {aviso && <Aviso>{aviso}</Aviso>}

          <Boton ancho type="submit" disabled={enviando}>
            {enviando ? 'Un segundo…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
          </Boton>
        </form>

        <p className="text-center text-sm text-grafito">
          {modo === 'entrar' ? '¿Todavía no tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
          <button
            type="button"
            onClick={() => {
              setModo(modo === 'entrar' ? 'registro' : 'entrar')
              setError(null)
              setAviso(null)
            }}
            className="text-tinta font-semibold underline underline-offset-4"
          >
            {modo === 'entrar' ? 'Registrate' : 'Entrá'}
          </button>
        </p>

        <p className="text-center text-sm text-grafito">
          {modo === 'registro' ? 'Al crear la cuenta aceptás nuestra ' : 'Leé nuestra '}
          <Link to="/privacidad" className="underline underline-offset-4">
            política de privacidad
          </Link>
          .
        </p>
      </div>
    </ShellPlano>
  )
}

/** Los mensajes de Supabase vienen en inglés y son crípticos para el usuario. */
function traducir(mensaje: string): string {
  const m = mensaje.toLowerCase()
  // "Invalid login credentials" es el mismo mensaje tanto si la contraseña
  // está mal como si el mail no existe, a propósito: si el error dijera cuál
  // de las dos cosas pasó, cualquiera podría usar este formulario para
  // averiguar qué mails están registrados.
  if (m.includes('invalid login credentials')) return 'Mail o contraseña incorrectos.'
  if (m.includes('user already registered')) return 'Ya hay una cuenta con ese mail. Probá entrar.'
  if (m.includes('email not confirmed')) return 'Todavía no confirmaste el mail. Revisá tu casilla.'
  if (m.includes('password')) return 'La contraseña no cumple los requisitos mínimos.'
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Demasiados intentos seguidos. Esperá un momento.'
  }
  // Esto no viene de Supabase: es el fetch del navegador fallando antes de
  // llegar a mandar el pedido (sin conexión, extensión que lo bloquea, etc.).
  // Cada navegador lo redacta distinto.
  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed')) {
    return 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.'
  }
  return mensaje
}
