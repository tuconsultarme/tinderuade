import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MODO_DEMO } from '@/lib/demo'
import type { Carrera, Sede } from '@/lib/tipos'

const SEDES_DEMO: Sede[] = [
  { id: 1, nombre: 'Monserrat' },
  { id: 2, nombre: 'Belgrano' },
]

// Mismo listado que supabase/seed.sql, para que el combo de Carrera se vea
// igual en demo que contra la base real.
const CARRERAS_DEMO: Carrera[] = [
  { id: 1, nombre: 'Ingeniería en Informática', facultad: 'Ingeniería y Ciencias Exactas' },
  { id: 2, nombre: 'Ingeniería Industrial', facultad: 'Ingeniería y Ciencias Exactas' },
  { id: 3, nombre: 'Ingeniería Electrónica', facultad: 'Ingeniería y Ciencias Exactas' },
  { id: 4, nombre: 'Ingeniería en Telecomunicaciones', facultad: 'Ingeniería y Ciencias Exactas' },
  { id: 5, nombre: 'Ingeniería en Alimentos', facultad: 'Ingeniería y Ciencias Exactas' },
  {
    id: 6,
    nombre: 'Licenciatura en Gestión de Tecnología de la Información',
    facultad: 'Ingeniería y Ciencias Exactas',
  },
  { id: 7, nombre: 'Licenciatura en Ciencia de Datos', facultad: 'Ingeniería y Ciencias Exactas' },

  { id: 8, nombre: 'Contador Público', facultad: 'Ciencias Económicas' },
  { id: 9, nombre: 'Licenciatura en Administración de Empresas', facultad: 'Ciencias Económicas' },
  { id: 10, nombre: 'Licenciatura en Comercio Internacional', facultad: 'Ciencias Económicas' },
  { id: 11, nombre: 'Licenciatura en Dirección de Negocios Globales (GBM)', facultad: 'Ciencias Económicas' },
  { id: 12, nombre: 'Licenciatura en Dirección en Finanzas Globales (GFM)', facultad: 'Ciencias Económicas' },
  { id: 13, nombre: 'Licenciatura en Economía', facultad: 'Ciencias Económicas' },
  { id: 14, nombre: 'Licenciatura en Finanzas', facultad: 'Ciencias Económicas' },
  { id: 15, nombre: 'Licenciatura en Finanzas Digitales', facultad: 'Ciencias Económicas' },
  { id: 16, nombre: 'Licenciatura en Marketing', facultad: 'Ciencias Económicas' },
  { id: 17, nombre: 'Licenciatura en Negocios Digitales', facultad: 'Ciencias Económicas' },
  { id: 18, nombre: 'Licenciatura en Recursos Humanos', facultad: 'Ciencias Económicas' },
  {
    id: 19,
    nombre: 'Tecnicatura Universitaria en Comercio Electrónico e Innovación Digital',
    facultad: 'Ciencias Económicas',
  },
  { id: 20, nombre: 'Tecnicatura Universitaria en Finanzas Digitales', facultad: 'Ciencias Económicas' },

  { id: 21, nombre: 'Abogacía', facultad: 'Ciencias Jurídicas y Sociales' },
  { id: 22, nombre: 'Licenciatura en Relaciones Internacionales', facultad: 'Ciencias Jurídicas y Sociales' },
  { id: 23, nombre: 'Licenciatura en Psicología', facultad: 'Ciencias Jurídicas y Sociales' },

  { id: 24, nombre: 'Diseño Gráfico', facultad: 'Diseño' },
  { id: 25, nombre: 'Diseño Industrial', facultad: 'Diseño' },
  { id: 26, nombre: 'Diseño de Indumentaria y Textil', facultad: 'Diseño' },
  { id: 27, nombre: 'Diseño Multimedial', facultad: 'Diseño' },

  { id: 28, nombre: 'Licenciatura en Publicidad', facultad: 'Comunicación' },
  { id: 29, nombre: 'Licenciatura en Comunicación Audiovisual', facultad: 'Comunicación' },

  { id: 30, nombre: 'Arquitectura', facultad: 'Arquitectura y Urbanismo' },
]

/**
 * Carreras y sedes.
 *
 * Ojo: las políticas de estos catálogos son `to authenticated`, así que sin
 * sesión iniciada devuelven vacío en vez de error. Este hook solo sirve dentro
 * de las pantallas con login — en una pantalla pública los combos saldrían
 * vacíos sin ninguna señal de por qué.
 */
export function useCatalogos() {
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (MODO_DEMO) {
      setCarreras(CARRERAS_DEMO)
      setSedes(SEDES_DEMO)
      setCargando(false)
      return
    }

    let vigente = true

    Promise.all([
      supabase.from('carreras').select('id, nombre, facultad').order('nombre'),
      supabase.from('sedes').select('id, nombre').order('nombre'),
    ]).then(([resCarreras, resSedes]) => {
      if (!vigente) return
      setCarreras((resCarreras.data as Carrera[]) ?? [])
      setSedes((resSedes.data as Sede[]) ?? [])
      setCargando(false)
    })

    return () => {
      vigente = false
    }
  }, [])

  return { carreras, sedes, cargando }
}
