import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSesion } from '@/context/SesionContext'
import { useCatalogos } from '@/hooks/useCatalogos'
import { useMisFotos } from '@/hooks/useMisFotos'
import { ShellPlano } from '@/components/shell/AppShell'
import { CampoTexto, CampoArea, CampoSelect } from '@/components/ui/Campo'
import { Boton } from '@/components/ui/Boton'
import { Aviso, Cargando } from '@/components/ui/Estados'
import { GestorFotos } from '@/components/GestorFotos'
import { INTENCIONES } from '@/lib/intenciones'
import { FACULTADES } from '@/lib/facultades'
import type { Genero, Intencion } from '@/lib/tipos'

const GENEROS: { valor: Genero; etiqueta: string }[] = [
  { valor: 'femenino', etiqueta: 'Femenino' },
  { valor: 'masculino', etiqueta: 'Masculino' },
  { valor: 'no_binario', etiqueta: 'No binario' },
  { valor: 'otro', etiqueta: 'Otro' },
]

const PASOS = ['Vos', 'Intención', 'Fotos', 'Preferencias'] as const

export function Onboarding() {
  const { sesion, refrescarPerfil } = useSesion()
  const { carreras, sedes, cargando: cargandoCat } = useCatalogos()
  const userId = sesion?.user.id
  const { fotos, urls, refrescar: refrescarFotos } = useMisFotos(userId)

  const [paso, setPaso] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const [nombre, setNombre] = useState('')
  const [nacimiento, setNacimiento] = useState('')
  const [genero, setGenero] = useState<Genero | ''>('')
  const [facultad, setFacultad] = useState('')
  const [carreraId, setCarreraId] = useState('')
  const [sedeId, setSedeId] = useState('')
  const [anioIngreso, setAnioIngreso] = useState('')
  const [intenciones, setIntenciones] = useState<Intencion[]>([])
  const [bio, setBio] = useState('')
  const [edadMin, setEdadMin] = useState('18')
  const [edadMax, setEdadMax] = useState('35')
  const [instagram, setInstagram] = useState('')

  if (!userId) return null
  if (cargandoCat) {
    return (
      <ShellPlano>
        <Cargando texto="Preparando todo" />
      </ShellPlano>
    )
  }

  function alternar<T>(lista: T[], valor: T): T[] {
    return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]
  }

  function validarPaso(): string | null {
    if (paso === 0) {
      if (nombre.trim().length < 2) return 'Poné tu nombre (mínimo 2 caracteres).'
      if (!nacimiento) return 'Falta tu fecha de nacimiento.'
      if (edadDesde(nacimiento) < 18) return 'Tenés que ser mayor de 18 para usar la app.'
      if (!genero) return 'Elegí una opción de género.'
      // Obligatoria desde la 0009: la lente de Estudio filtra por carrera, así
      // que sin cargarla esa mitad de la app queda vacía sin explicación.
      if (!carreraId) return 'Elegí tu carrera: la usamos para mostrarte gente de Estudio.'
    }
    if (paso === 1 && intenciones.length === 0) {
      return 'Elegí al menos una intención. Podés cambiarla cuando quieras.'
    }
    if (paso === 2 && fotos.length === 0) {
      return 'Subí al menos una foto: sin foto no aparecés en el mazo de nadie.'
    }
    if (paso === 3) {
      const min = Number(edadMin)
      const max = Number(edadMax)
      if (!Number.isFinite(min) || !Number.isFinite(max)) return 'El rango de edad no es válido.'
      if (min < 18) return 'La edad mínima no puede ser menor a 18.'
      if (min > max) return 'La edad mínima no puede ser mayor que la máxima.'
      if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) {
        return 'Ese usuario de Instagram no es válido (solo letras, números, punto y guion bajo).'
      }
    }
    return null
  }

  function siguiente() {
    const problema = validarPaso()
    if (problema) {
      setError(problema)
      return
    }
    setError(null)

    // El perfil se crea al terminar el primer paso y no al final: las fotos
    // tienen una FK contra profiles, así que sin fila no se puede subir nada.
    if (paso === 0) {
      void guardarBase()
      return
    }
    if (paso === 1) {
      void guardarIntenciones()
      return
    }
    if (paso === 3) {
      void terminar()
      return
    }
    setPaso((p) => p + 1)
  }

  async function guardarBase() {
    setGuardando(true)
    const { error: err } = await supabase.from('profiles').upsert({
      id: userId,
      nombre: nombre.trim(),
      fecha_nacimiento: nacimiento,
      genero,
      carrera_id: carreraId ? Number(carreraId) : null,
      sede_id: sedeId ? Number(sedeId) : null,
      anio_ingreso: anioIngreso ? Number(anioIngreso) : null,
    })
    setGuardando(false)

    if (err) {
      setError(traducir(err.message))
      return
    }
    await refrescarPerfil()
    setPaso(1)
  }

  async function guardarIntenciones() {
    setGuardando(true)
    // Se borran y reinsertan: la tabla es (profile_id, intencion) sin más
    // estado, así que reemplazar es más simple que calcular el diff.
    await supabase.from('profile_intenciones').delete().eq('profile_id', userId)
    const { error: err } = await supabase
      .from('profile_intenciones')
      .insert(intenciones.map((i) => ({ profile_id: userId, intencion: i })))
    setGuardando(false)

    if (err) {
      setError(traducir(err.message))
      return
    }
    setPaso(2)
  }

  async function terminar() {
    setGuardando(true)
    const { error: err } = await supabase
      .from('profiles')
      .update({
        bio: bio.trim() || null,
        busca_generos: [],
        edad_min: Number(edadMin),
        edad_max: Number(edadMax),
        instagram: instagram.trim() || null,
        onboarding_completo: true,
      })
      .eq('id', userId)
    setGuardando(false)

    if (err) {
      setError(traducir(err.message))
      return
    }
    // Al quedar onboarding_completo en true, el guardián de rutas manda al mazo.
    await refrescarPerfil()
  }

  return (
    <ShellPlano>
      <div className="px-6 pt-6 pb-3 shrink-0">
        <ol className="flex gap-1.5" aria-label="Progreso del registro">
          {PASOS.map((etiqueta, i) => (
            <li key={etiqueta} className="flex-1">
              <span className="sr-only">
                Paso {i + 1} de {PASOS.length}: {etiqueta}
                {i === paso ? ' (actual)' : ''}
              </span>
              <span
                aria-hidden="true"
                className={[
                  'block h-1 rounded-full',
                  i < paso ? 'bg-tinta' : i === paso ? 'bg-[var(--acento)]' : 'bg-lapiz',
                ].join(' ')}
              />
            </li>
          ))}
        </ol>
        <h1 className="mt-4 text-3xl">{tituloPaso(paso)}</h1>
        <p className="mt-1.5 text-sm text-grafito text-balance">{bajadaPaso(paso)}</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pb-4">
        <div className="flex flex-col gap-4">
          {paso === 0 && (
            <>
              <CampoTexto
                etiqueta="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={50}
                autoComplete="given-name"
                placeholder="Cómo querés que te llamen"
              />
              <CampoTexto
                etiqueta="Fecha de nacimiento"
                type="date"
                value={nacimiento}
                onChange={(e) => setNacimiento(e.target.value)}
                ayuda="Se muestra solo tu edad, no la fecha."
              />
              <CampoSelect
                etiqueta="Género"
                value={genero}
                onChange={(e) => setGenero(e.target.value as Genero)}
              >
                <option value="">Elegir…</option>
                {GENEROS.map((g) => (
                  <option key={g.valor} value={g.valor}>
                    {g.etiqueta}
                  </option>
                ))}
              </CampoSelect>
              <CampoSelect
                etiqueta="Facultad"
                value={facultad}
                onChange={(e) => {
                  setFacultad(e.target.value)
                  setCarreraId('')
                }}
              >
                <option value="">Prefiero no decir</option>
                {FACULTADES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </CampoSelect>
              <CampoSelect
                etiqueta="Carrera"
                value={carreraId}
                onChange={(e) => setCarreraId(e.target.value)}
                disabled={!facultad}
              >
                <option value="">{facultad ? 'Elegí tu carrera' : 'Elegí tu facultad primero'}</option>
                {carreras
                  .filter((c) => c.facultad === facultad)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
              </CampoSelect>
              <CampoSelect etiqueta="Sede" value={sedeId} onChange={(e) => setSedeId(e.target.value)}>
                <option value="">Prefiero no decir</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </CampoSelect>
              <CampoTexto
                etiqueta="Año de ingreso"
                type="number"
                inputMode="numeric"
                min={2000}
                max={new Date().getFullYear()}
                value={anioIngreso}
                onChange={(e) => setAnioIngreso(e.target.value)}
                placeholder="2023"
              />
            </>
          )}

          {paso === 1 && (
            <fieldset className="flex flex-col gap-2.5">
              <legend className="sr-only">Con qué intención querés usar la app</legend>
              {INTENCIONES.map((i) => {
                const elegida = intenciones.includes(i.id)
                return (
                  <label
                    key={i.id}
                    data-modo={i.id}
                    className={[
                      'flex items-start gap-3 p-4 rounded-chip border-2 cursor-pointer',
                      elegida ? 'border-tinta bg-[var(--acento)] text-tinta-fija' : 'border-lapiz',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={elegida}
                      onChange={() => setIntenciones((prev) => alternar(prev, i.id))}
                      className="mt-1 w-5 h-5 accent-[var(--color-tinta)]"
                    />
                    <span>
                      <span className="block font-semibold">{i.etiqueta}</span>
                      <span className="block text-sm opacity-75">{i.titulo}</span>
                    </span>
                  </label>
                )
              })}
            </fieldset>
          )}

          {paso === 2 && (
            <GestorFotos userId={userId} fotos={fotos} urls={urls} onCambio={refrescarFotos} />
          )}

          {paso === 3 && (
            <>
              <CampoArea
                etiqueta="Bio"
                rows={4}
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Qué cursás, qué te gusta hacer, qué buscás."
                ayuda={`${bio.length}/500`}
              />

              {/* La preferencia de género se sacó en la migración 0009: ahora
                  las lentes filtran solas (Match no te muestra tu mismo género,
                  Estudio solo tu carrera), así que no hay nada que elegir. */}
              <p className="text-sm text-grafito">
                En <strong className="text-tinta">Match</strong> te vamos a mostrar gente de otro
                género. En <strong className="text-tinta">Estudio</strong>, solo gente de tu
                carrera.
              </p>

              <div className="flex gap-3">
                <CampoTexto
                  etiqueta="Edad mínima"
                  type="number"
                  inputMode="numeric"
                  min={18}
                  max={120}
                  value={edadMin}
                  onChange={(e) => setEdadMin(e.target.value)}
                />
                <CampoTexto
                  etiqueta="Edad máxima"
                  type="number"
                  inputMode="numeric"
                  min={18}
                  max={120}
                  value={edadMax}
                  onChange={(e) => setEdadMax(e.target.value)}
                />
              </div>

              <CampoTexto
                etiqueta="Instagram (opcional)"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value.replace(/^@/, ''))}
                autoCapitalize="none"
                spellCheck={false}
                placeholder="tuusuario"
                ayuda="Solo lo ve la gente con la que hiciste match."
              />
            </>
          )}

          {error && <Aviso>{error}</Aviso>}
        </div>
      </div>

      <div className="shrink-0 px-6 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-lapiz flex gap-3">
        {paso > 0 && (
          <Boton
            variante="fantasma"
            onClick={() => {
              setError(null)
              setPaso((p) => p - 1)
            }}
          >
            Atrás
          </Boton>
        )}
        <Boton ancho onClick={siguiente} disabled={guardando}>
          {guardando ? 'Guardando…' : paso === PASOS.length - 1 ? 'Entrar a la app' : 'Seguir'}
        </Boton>
      </div>
    </ShellPlano>
  )
}

function edadDesde(fecha: string): number {
  const nac = new Date(fecha)
  const hoy = new Date()
  let edad = hoy.getFullYear() - nac.getFullYear()
  const mes = hoy.getMonth() - nac.getMonth()
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad -= 1
  return edad
}

function tituloPaso(paso: number): string {
  return ['Contanos quién sos', '¿Para qué estás acá?', 'Ponele cara', 'Últimos detalles'][paso]
}

function bajadaPaso(paso: number): string {
  return [
    'Lo básico para que te encuentren los de tu facu.',
    'Podés elegir más de una. El mazo cambia según con qué lente mires.',
    'Al menos una. La primera es la que se ve en el mazo.',
    'Todo esto lo podés cambiar después desde tu perfil.',
  ][paso]
}

function traducir(mensaje: string): string {
  const m = mensaje.toLowerCase()
  if (m.includes('mayor de 18')) return 'Tenés que ser mayor de 18 para usar la app.'
  if (m.includes('máximo 6 fotos')) return 'Ya tenés el máximo de 6 fotos.'
  if (m.includes('duplicate key')) return 'Eso ya estaba cargado.'
  return mensaje
}
