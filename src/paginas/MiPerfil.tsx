import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useSesion } from '@/context/SesionContext'
import { useMisFotos } from '@/hooks/useMisFotos'
import { useCatalogos } from '@/hooks/useCatalogos'
import { GestorFotos } from '@/components/GestorFotos'
import { CampoArea, CampoSelect, CampoTexto } from '@/components/ui/Campo'
import { Boton } from '@/components/ui/Boton'
import { Aviso, Cargando } from '@/components/ui/Estados'
import { useToast } from '@/components/ui/Toast'
import { INTENCIONES } from '@/lib/intenciones'
import { FACULTADES } from '@/lib/facultades'
import { MODO_DEMO } from '@/lib/demo'
import type { Intencion } from '@/lib/tipos'

/**
 * Guardián. El formulario va aparte y se monta recién con el perfil ya
 * cargado, así sus campos arrancan con los valores reales en el primer render
 * en vez de sembrarse después con un efecto.
 */
export function MiPerfil() {
  const { sesion, perfil } = useSesion()
  if (!sesion || !perfil) return <Cargando texto="Cargando tu perfil" />
  return <FormularioPerfil key={perfil.id} />
}

function FormularioPerfil() {
  const { sesion, perfil, intenciones: intencionesGuardadas, refrescarPerfil, salir } = useSesion()
  const userId = sesion!.user.id
  const datos = perfil!
  const { fotos, urls, cargando: cargandoFotos, refrescar } = useMisFotos(userId)
  const { carreras, sedes } = useCatalogos()
  const { mostrar } = useToast()

  const [bio, setBio] = useState(datos.bio ?? '')
  const [facultad, setFacultad] = useState('')
  const [carreraId, setCarreraId] = useState(datos.carrera_id ? String(datos.carrera_id) : '')
  const [sedeId, setSedeId] = useState(datos.sede_id ? String(datos.sede_id) : '')
  const [instagram, setInstagram] = useState(datos.instagram ?? '')
  const [edadMin, setEdadMin] = useState(String(datos.edad_min))
  const [edadMax, setEdadMax] = useState(String(datos.edad_max))
  // Arranca con lo que ya tiene el contexto: el formulario se monta con el
  // perfil cargado (ver el guardián de arriba), así que no hace falta un
  // efecto que las siembre después.
  const [intenciones, setIntenciones] = useState<Intencion[]>(intencionesGuardadas)

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // La carrera guardada no trae su facultad: se busca en el catálogo apenas
  // llega, una sola vez, para que el combo de Carrera arranque ya filtrado.
  useEffect(() => {
    if (facultad || !carreraId || carreras.length === 0) return
    const actual = carreras.find((c) => String(c.id) === carreraId)
    if (actual) setFacultad(actual.facultad)
  }, [carreras, carreraId, facultad])

  async function guardar() {
    setError(null)

    const min = Number(edadMin)
    const max = Number(edadMax)
    if (min < 18 || min > max) {
      setError('Revisá el rango de edad.')
      return
    }
    if (intenciones.length === 0) {
      setError('Tenés que mantener al menos una intención activa.')
      return
    }
    if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) {
      setError('Ese usuario de Instagram no es válido.')
      return
    }

    setGuardando(true)

    const { error: errPerfil } = await supabase
      .from('profiles')
      .update({
        bio: bio.trim() || null,
        carrera_id: carreraId ? Number(carreraId) : null,
        sede_id: sedeId ? Number(sedeId) : null,
        instagram: instagram.trim() || null,
        edad_min: min,
        edad_max: max,
      })
      .eq('id', userId)

    if (errPerfil) {
      setGuardando(false)
      setError(errPerfil.message)
      return
    }

    await supabase.from('profile_intenciones').delete().eq('profile_id', userId)
    const { error: errInt } = await supabase
      .from('profile_intenciones')
      .insert(intenciones.map((i) => ({ profile_id: userId, intencion: i })))

    setGuardando(false)

    if (errInt) {
      setError(errInt.message)
      return
    }

    await refrescarPerfil()
    mostrar('Listo, guardado.')
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-6">
      <header>
        <h1 className="text-3xl">{datos.nombre}</h1>
        <p className="dato text-grafito mt-1">{sesion?.user.email}</p>
      </header>

      {MODO_DEMO && (
        <Aviso>
          Modo demo: acá no se guarda nada y no se pueden subir fotos. Para eso hace falta la
          base conectada.
        </Aviso>
      )}

      {cargandoFotos ? (
        <Cargando texto="Cargando fotos" />
      ) : (
        <GestorFotos userId={userId} fotos={fotos} urls={urls} onCambio={refrescar} />
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="dato text-grafito mb-1">Con qué intención estás</legend>
        <div className="flex flex-wrap gap-2">
          {INTENCIONES.map((i) => {
            const activa = intenciones.includes(i.id)
            return (
              <label
                key={i.id}
                data-modo={i.id}
                className={[
                  'px-3.5 py-2.5 rounded-chip border-2 cursor-pointer text-sm font-medium',
                  activa
                    ? 'border-tinta bg-[var(--acento)] text-tinta-fija'
                    : 'border-lapiz text-grafito',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={activa}
                  onChange={() =>
                    setIntenciones((prev) =>
                      prev.includes(i.id) ? prev.filter((x) => x !== i.id) : [...prev, i.id],
                    )
                  }
                  className="sr-only"
                />
                {i.etiqueta}
              </label>
            )
          })}
        </div>
      </fieldset>

      <CampoArea
        etiqueta="Bio"
        rows={4}
        maxLength={500}
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        ayuda={`${bio.length}/500`}
      />

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
        <option value="">{facultad ? 'Prefiero no decir' : 'Elegí tu facultad primero'}</option>
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

      <div className="flex gap-3">
        <CampoTexto
          etiqueta="Edad mínima"
          type="number"
          inputMode="numeric"
          value={edadMin}
          onChange={(e) => setEdadMin(e.target.value)}
        />
        <CampoTexto
          etiqueta="Edad máxima"
          type="number"
          inputMode="numeric"
          value={edadMax}
          onChange={(e) => setEdadMax(e.target.value)}
        />
      </div>

      <CampoTexto
        etiqueta="Instagram"
        value={instagram}
        onChange={(e) => setInstagram(e.target.value.replace(/^@/, ''))}
        autoCapitalize="none"
        spellCheck={false}
        ayuda="Solo lo ve la gente con la que hiciste match."
      />

      {error && <Aviso>{error}</Aviso>}
      <Boton ancho onClick={() => void guardar()} disabled={guardando || MODO_DEMO}>
        {guardando ? 'Guardando…' : 'Guardar cambios'}
      </Boton>

      <Link
        to="/privacidad"
        className="text-center text-sm text-grafito underline underline-offset-4"
      >
        Política de privacidad
      </Link>

      {/* En demo no hay a dónde salir: sin sesión real, cerrarla dejaría la app
          trabada en la pantalla de login. */}
      {!MODO_DEMO && (
        <Boton ancho variante="fantasma" onClick={() => void salir()}>
          Cerrar sesión
        </Boton>
      )}
    </div>
  )
}
