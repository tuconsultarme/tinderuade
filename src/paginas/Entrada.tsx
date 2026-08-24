import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DOMINIO_MAIL_REQUERIDO } from '@/lib/config'
import { ShellPlano } from '@/components/shell/AppShell'
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
      <div className="flex-1 flex flex-col justify-center px-6 py-10 gap-8">
        <div>
          <p className="dato text-grafito mb-3">UADE</p>
          <h1 className="titulo-resaltado text-[clamp(2.5rem,13vw,3.75rem)]">
            Conocé gente
            <br />
            <span className="resaltado px-1.5">de tu facu.</span>
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
      </div>
    </ShellPlano>
  )
}

/** Los mensajes de Supabase vienen en inglés y son crípticos para el usuario. */
function traducir(mensaje: string): string {
  const m = mensaje.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Mail o contraseña incorrectos.'
  if (m.includes('user already registered')) return 'Ya hay una cuenta con ese mail. Probá entrar.'
  if (m.includes('email not confirmed')) return 'Todavía no confirmaste el mail. Revisá tu casilla.'
  if (m.includes('password')) return 'La contraseña no cumple los requisitos mínimos.'
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Demasiados intentos seguidos. Esperá un momento.'
  }
  return mensaje
}
