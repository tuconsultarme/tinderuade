import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { DOMINIO_MAIL_REQUERIDO } from '@/lib/config'
import { ShellPlano } from '@/components/shell/AppShell'
import { AlternadorTema } from '@/components/AlternadorTema'
import { CampoTexto } from '@/components/ui/Campo'
import { Boton } from '@/components/ui/Boton'
import { Aviso } from '@/components/ui/Estados'

type Modo = 'entrar' | 'registro' | 'recuperar'
/** Pasos del flujo de recuperar contraseña. */
type PasoRec = 'mail' | 'codigo' | 'clave'

const RE_MAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function Entrada() {
  const [modo, setModo] = useState<Modo>('entrar')
  const [mail, setMail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Recuperar contraseña.
  const [pasoRec, setPasoRec] = useState<PasoRec>('mail')
  const [codigo, setCodigo] = useState('')
  const [claveNueva, setClaveNueva] = useState('')

  /** Vuelve todo a foja cero al cambiar de pantalla. */
  function irA(nuevo: Modo) {
    setModo(nuevo)
    setError(null)
    setAviso(null)
    setPasoRec('mail')
    setCodigo('')
    setClaveNueva('')
  }

  function validar(): string | null {
    if (!RE_MAIL.test(mail)) return 'Ese mail no parece válido.'
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

  // ---- Recuperar contraseña ----

  /** Paso 1: pedir el código al mail. */
  async function pedirCodigo(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setAviso(null)
    if (!RE_MAIL.test(mail)) {
      setError('Ese mail no parece válido.')
      return
    }
    setEnviando(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(mail)
    setEnviando(false)
    if (err) {
      setError(traducir(err.message))
      return
    }
    // No se confirma si el mail existe, a propósito: si no, cualquiera podría
    // averiguar qué mails están registrados probando acá.
    setAviso('Si ese mail está registrado, te llega un código de 6 dígitos. Revisá tu casilla.')
    setPasoRec('codigo')
  }

  /** Paso 2: verificar el código. */
  async function verificarCodigo(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setAviso(null)
    if (codigo.trim().length < 6) {
      setError('El código tiene 6 dígitos.')
      return
    }
    setEnviando(true)
    const { error: err } = await supabase.auth.verifyOtp({
      email: mail,
      token: codigo.trim(),
      type: 'recovery',
    })
    setEnviando(false)
    if (err) {
      setError(traducir(err.message))
      return
    }
    // El código válido deja una sesión abierta: ya se puede cambiar la clave.
    setPasoRec('clave')
  }

  /** Paso 3: guardar la contraseña nueva. */
  async function guardarClaveNueva(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setAviso(null)
    if (claveNueva.length < 8) {
      setError('La contraseña tiene que tener al menos 8 caracteres.')
      return
    }
    setEnviando(true)
    const { error: err } = await supabase.auth.updateUser({ password: claveNueva })
    setEnviando(false)
    if (err) {
      setError(traducir(err.message))
      return
    }
    // Ya quedó logueado con la clave nueva; el contexto lo rutea a la app.
    setAviso('¡Listo! Tu contraseña quedó cambiada.')
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

          {modo === 'recuperar' ? (
            <>
              <h1 className="titulo-resaltado text-[clamp(2rem,10vw,3rem)] font-extrabold">
                <span className="resaltado">Recuperar</span>
                <br />
                contraseña.
              </h1>
              <p className="mt-4 text-grafito text-balance">
                {pasoRec === 'mail' && 'Poné tu mail y te mandamos un código para cambiarla.'}
                {pasoRec === 'codigo' && 'Escribí el código de 6 dígitos que te llegó al mail.'}
                {pasoRec === 'clave' && 'Elegí una contraseña nueva.'}
              </p>
            </>
          ) : (
            <>
              <h1 className="titulo-resaltado text-[clamp(2.25rem,11vw,3.25rem)] font-extrabold">
                Conocé gente
                <br />
                <span className="resaltado">de tu facu.</span>
              </h1>
              <p className="mt-4 text-grafito text-balance">
                Para salir, para hacer amigos o para no rendir solo. Vos elegís con qué intención mirás.
              </p>
            </>
          )}
        </div>

        {modo === 'recuperar' ? (
          <RecuperarFlujo
            paso={pasoRec}
            mail={mail}
            setMail={setMail}
            codigo={codigo}
            setCodigo={setCodigo}
            claveNueva={claveNueva}
            setClaveNueva={setClaveNueva}
            error={error}
            aviso={aviso}
            enviando={enviando}
            onPedir={pedirCodigo}
            onVerificar={verificarCodigo}
            onGuardar={guardarClaveNueva}
          />
        ) : (
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

            {modo === 'entrar' && (
              <button
                type="button"
                onClick={() => irA('recuperar')}
                className="self-end -mt-1 text-sm text-grafito underline underline-offset-4"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}

            <Boton ancho type="submit" disabled={enviando}>
              {enviando ? 'Un segundo…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
            </Boton>
          </form>
        )}

        {modo === 'recuperar' ? (
          <p className="text-center text-sm text-grafito">
            <button
              type="button"
              onClick={() => irA('entrar')}
              className="text-tinta font-semibold underline underline-offset-4"
            >
              Volver a entrar
            </button>
          </p>
        ) : (
          <p className="text-center text-sm text-grafito">
            {modo === 'entrar' ? '¿Todavía no tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
            <button
              type="button"
              onClick={() => irA(modo === 'entrar' ? 'registro' : 'entrar')}
              className="text-tinta font-semibold underline underline-offset-4"
            >
              {modo === 'entrar' ? 'Registrate' : 'Entrá'}
            </button>
          </p>
        )}

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

interface RecuperarProps {
  paso: PasoRec
  mail: string
  setMail: (v: string) => void
  codigo: string
  setCodigo: (v: string) => void
  claveNueva: string
  setClaveNueva: (v: string) => void
  error: string | null
  aviso: string | null
  enviando: boolean
  onPedir: (e: React.FormEvent) => void
  onVerificar: (e: React.FormEvent) => void
  onGuardar: (e: React.FormEvent) => void
}

function RecuperarFlujo({
  paso,
  mail,
  setMail,
  codigo,
  setCodigo,
  claveNueva,
  setClaveNueva,
  error,
  aviso,
  enviando,
  onPedir,
  onVerificar,
  onGuardar,
}: RecuperarProps) {
  if (paso === 'mail') {
    return (
      <form onSubmit={onPedir} className="flex flex-col gap-4" noValidate>
        <CampoTexto
          etiqueta="Mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={mail}
          onChange={(e) => setMail(e.target.value)}
          placeholder="nombre@mail.com"
          required
        />
        {error && <Aviso>{error}</Aviso>}
        {aviso && <Aviso>{aviso}</Aviso>}
        <Boton ancho type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviarme el código'}
        </Boton>
      </form>
    )
  }

  if (paso === 'codigo') {
    return (
      <form onSubmit={onVerificar} className="flex flex-col gap-4" noValidate>
        <CampoTexto
          etiqueta="Código"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          ayuda="Son 6 dígitos. Puede tardar un minuto en llegar."
          required
        />
        {error && <Aviso>{error}</Aviso>}
        {aviso && <Aviso>{aviso}</Aviso>}
        <Boton ancho type="submit" disabled={enviando}>
          {enviando ? 'Verificando…' : 'Verificar código'}
        </Boton>
      </form>
    )
  }

  return (
    <form onSubmit={onGuardar} className="flex flex-col gap-4" noValidate>
      <CampoTexto
        etiqueta="Contraseña nueva"
        type="password"
        autoComplete="new-password"
        value={claveNueva}
        onChange={(e) => setClaveNueva(e.target.value)}
        ayuda="Mínimo 8 caracteres."
        required
      />
      {error && <Aviso>{error}</Aviso>}
      {aviso && <Aviso>{aviso}</Aviso>}
      <Boton ancho type="submit" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar contraseña'}
      </Boton>
    </form>
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
  // OTP de recuperación vencido o mal tipeado.
  if (m.includes('otp') || m.includes('token')) {
    return 'El código venció o no es válido. Pedí uno nuevo.'
  }
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
