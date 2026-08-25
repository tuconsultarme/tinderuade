/**
 * Tipos que reflejan el schema de `supabase/migrations/`.
 * Si cambia una migración, esto tiene que cambiar con ella.
 */

export type Genero = 'masculino' | 'femenino' | 'no_binario' | 'otro'
export type Intencion = 'citas' | 'amistad' | 'estudio'
export type DireccionSwipe = 'like' | 'pass'

export interface Sede {
  id: number
  nombre: string
}

export interface Carrera {
  id: number
  nombre: string
  facultad: string
}

export interface Materia {
  id: number
  codigo: string | null
  nombre: string
  carrera_id: number | null
}

export interface Perfil {
  id: string
  nombre: string
  fecha_nacimiento: string
  genero: Genero
  busca_generos: Genero[]
  bio: string | null
  carrera_id: number | null
  sede_id: number | null
  anio_ingreso: number | null
  instagram: string | null
  edad_min: number
  edad_max: number
  onboarding_completo: boolean
  activo: boolean
  ultima_actividad: string
}

export interface Foto {
  id: string
  profile_id: string
  storage_path: string
  orden: number
}

/** Lo que devuelve la función `get_candidatos()`. */
export interface Candidato {
  id: string
  nombre: string
  edad: number
  bio: string | null
  carrera: string | null
  sede: string | null
  anio_ingreso: number | null
  materias_en_comun: number
}

/** Candidato con sus fotos ya resueltas a signed URLs. */
export interface CandidatoConFotos extends Candidato {
  fotos: string[]
}

export interface Match {
  id: string
  profile_a: string
  profile_b: string
  intencion: Intencion
  activo: boolean
  created_at: string
}

export interface Mensaje {
  id: number
  match_id: string
  emisor_id: string
  /** Null cuando el mensaje es solo una foto. */
  contenido: string | null
  /** Path en el bucket privado fotos-chat, o null si es solo texto. */
  imagen_path?: string | null
  /** Id del mensaje al que responde (cita), o null. */
  responde_a?: number | null
  leido_at: string | null
  created_at: string
}

/** Un match ya resuelto contra el perfil del otro, para la lista de chats. */
export interface MatchConPerfil {
  id: string
  intencion: Intencion
  created_at: string
  otro: {
    id: string
    nombre: string
    foto: string | null
  }
  ultimoMensaje: Mensaje | null
  sinLeer: number
}
