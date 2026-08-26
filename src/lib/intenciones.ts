import type { Intencion } from './tipos'

/**
 * Las dos lentes de la app. El conmutador cambia entre ellas y con eso cambia
 * el acento, la composición de la card y a quién te muestra el mazo.
 *
 * El filtro de cada lente lo aplica `get_candidatos()` en la base (migración
 * 0009), no el cliente:
 *   match   → gente que no es de tu mismo género
 *   estudio → gente de tu misma carrera
 */
export interface DefIntencion {
  id: Intencion
  etiqueta: string
  /** Texto del encabezado del mazo cuando este modo está activo. */
  titulo: string
  /** Qué se muestra cuando no quedan candidatos. */
  vacio: string
  /** Verbo del botón de like, en la voz de cada modo. */
  like: string
  /** Cómo se anuncia el match. Va suelto y no armado por plantilla porque
   *  "quiere estudiar con vos en estudio" es redundante. */
  match: string
}

export const INTENCIONES: DefIntencion[] = [
  {
    id: 'match',
    etiqueta: 'Match',
    titulo: 'Gente para conocer',
    vacio: 'Por ahora no hay nadie más para mostrarte. Probá con Estudio o volvé más tarde.',
    like: 'Me gusta',
    match: 'también te dio like.',
  },
  {
    id: 'estudio',
    etiqueta: 'Estudio',
    titulo: 'Gente de tu carrera',
    vacio:
      'No hay más gente de tu carrera por ahora. Fijate que tengas la carrera cargada en tu perfil: sin eso, acá no aparece nadie.',
    like: 'Le entro',
    match: 'también quiere estudiar con vos.',
  },
]

export function definicion(id: Intencion): DefIntencion {
  const def = INTENCIONES.find((i) => i.id === id)
  if (!def) throw new Error(`Intención desconocida: ${id}`)
  return def
}
