import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { urlsFirmadas } from '@/lib/fotos'
import { useSesion } from '@/context/SesionContext'
import { ShellPlano } from '@/components/shell/AppShell'
import { Cargando, Vacio, Aviso } from '@/components/ui/Estados'
import { Boton } from '@/components/ui/Boton'
import { MODO_DEMO, perfilDetalleDemo, hayMatchDemo } from '@/lib/demo'

interface Detalle {
  nombre: string
  edad: number
  bio: string | null
  carrera: string | null
  sede: string | null
  anio_ingreso: number | null
  instagram: string | null
  fotos: string[]
}

export function PerfilDetalle() {
  const { perfilId } = useParams<{ perfilId: string }>()
  const { sesion } = useSesion()
  const navegar = useNavigate()

  const [detalle, setDetalle] = useState<Detalle | null>(null)
  const [cargando, setCargando] = useState(true)
  const [hayMatch, setHayMatch] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (!perfilId || !sesion) return

    if (MODO_DEMO) {
      const d = perfilDetalleDemo(perfilId)
      setDetalle(d)
      setHayMatch(hayMatchDemo(perfilId))
      setCargando(false)
      return
    }

    let vigente = true

    ;(async () => {
      const { data: p } = await supabase
        .from('profiles')
        .select('nombre, fecha_nacimiento, bio, anio_ingreso, instagram, carrera_id, sede_id')
        .eq('id', perfilId)
        .maybeSingle()

      if (!p) {
        if (vigente) setCargando(false)
        return
      }

      const miId = sesion.user.id
      const [a, b] = miId < perfilId ? [miId, perfilId] : [perfilId, miId]

      const [{ data: carrera }, { data: sede }, { data: fotos }, { data: match }] =
        await Promise.all([
          p.carrera_id
            ? supabase.from('carreras').select('nombre').eq('id', p.carrera_id).maybeSingle()
            : Promise.resolve({ data: null }),
          p.sede_id
            ? supabase.from('sedes').select('nombre').eq('id', p.sede_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from('fotos')
            .select('storage_path')
            .eq('profile_id', perfilId)
            .order('orden', { ascending: true }),
          supabase
            .from('matches')
            .select('id')
            .eq('profile_a', a)
            .eq('profile_b', b)
            .eq('activo', true)
            .maybeSingle(),
        ])

      const paths = (fotos ?? []).map((f) => f.storage_path as string)
      const firmadas = await urlsFirmadas(paths)
      if (!vigente) return

      setHayMatch(Boolean(match))
      setDetalle({
        nombre: p.nombre as string,
        edad: edadDesde(p.fecha_nacimiento as string),
        bio: p.bio as string | null,
        carrera: (carrera?.nombre as string) ?? null,
        sede: (sede?.nombre as string) ?? null,
        anio_ingreso: p.anio_ingreso as number | null,
        instagram: p.instagram as string | null,
        fotos: paths.map((p2) => firmadas.get(p2)).filter((u): u is string => Boolean(u)),
      })
      setCargando(false)
    })()

    return () => {
      vigente = false
    }
  }, [perfilId, sesion])

  async function bloquear() {
    if (!perfilId || !sesion) return
    const { error } = await supabase
      .from('bloqueos')
      .insert({ bloqueador_id: sesion.user.id, bloqueado_id: perfilId })
    setAviso(
      error
        ? 'No se pudo bloquear. Probá de nuevo.'
        : 'Listo: no se van a volver a ver en la app.',
    )
    if (!error) setTimeout(() => navegar('/mazo'), 1200)
  }

  if (cargando) {
    return (
      <ShellPlano>
        <Cargando texto="Cargando perfil" />
      </ShellPlano>
    )
  }

  if (!detalle) {
    return (
      <ShellPlano>
        <Vacio
          titulo="Perfil no disponible"
          detalle="Puede que la persona haya dado de baja su cuenta o que haya un bloqueo entre ustedes."
          accion={
            <Boton variante="fantasma" onClick={() => navegar(-1)}>
              Volver
            </Boton>
          }
        />
      </ShellPlano>
    )
  }

  return (
    <ShellPlano>
      <header className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-lapiz">
        <button
          type="button"
          onClick={() => navegar(-1)}
          aria-label="Volver"
          className="w-10 h-10 grid place-items-center -ml-1"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M15 5l-7 7 7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="text-xl">{detalle.nombre}</h1>
      </header>

      <div className="px-4 py-4 flex flex-col gap-5">
        {detalle.fotos.length > 0 && (
          <ul className="flex flex-col gap-2">
            {detalle.fotos.map((src, i) => (
              <li key={src} className="rounded-chip overflow-hidden border border-lapiz">
                <img
                  src={src}
                  alt={`Foto ${i + 1} de ${detalle.nombre}`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  className="w-full aspect-[3/4] object-cover"
                />
              </li>
            ))}
          </ul>
        )}

        <div>
          <h2 className="text-2xl">
            {detalle.nombre}
            <span className="tabular font-mono text-lg font-normal text-grafito ml-2">
              {detalle.edad}
            </span>
          </h2>
          <p className="dato text-grafito mt-1.5">
            {[
              detalle.carrera,
              detalle.anio_ingreso ? `Ingresó ${detalle.anio_ingreso}` : null,
              detalle.sede,
            ]
              .filter(Boolean)
              .join(' · ') || 'Sin datos de carrera'}
          </p>
        </div>

        {detalle.bio && <p className="leading-relaxed">{detalle.bio}</p>}

        {/* El Instagram solo se revela después del match: es la única forma de
            que la app siga siendo el canal y no un directorio de contactos. */}
        {hayMatch && detalle.instagram && (
          <p className="dato">
            Instagram <span className="resaltado px-1.5 py-0.5">@{detalle.instagram}</span>
          </p>
        )}

        {aviso && <Aviso>{aviso}</Aviso>}

        <Boton variante="fantasma" ancho onClick={() => void bloquear()}>
          Bloquear a {detalle.nombre}
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
