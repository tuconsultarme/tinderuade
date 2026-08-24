import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MODO_DEMO } from '@/lib/demo'
import type { Carrera, Sede } from '@/lib/tipos'

const SEDES_DEMO: Sede[] = [
  { id: 1, nombre: 'Monserrat' },
  { id: 2, nombre: 'Belgrano' },
]

const CARRERAS_DEMO: Carrera[] = [
  { id: 1, nombre: 'Abogacía', facultad: 'Derecho' },
  { id: 2, nombre: 'Administración de Empresas', facultad: 'Ciencias Económicas' },
  { id: 3, nombre: 'Comunicación', facultad: 'Comunicación y Diseño' },
  { id: 4, nombre: 'Contador Público', facultad: 'Ciencias Económicas' },
  { id: 5, nombre: 'Diseño Multimedial', facultad: 'Comunicación y Diseño' },
  { id: 6, nombre: 'Ingeniería en Informática', facultad: 'Ingeniería' },
  { id: 7, nombre: 'Ingeniería Industrial', facultad: 'Ingeniería' },
  { id: 8, nombre: 'Psicología', facultad: 'Ciencias Sociales' },
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
