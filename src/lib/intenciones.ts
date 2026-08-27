import type { Intencion } from './tipos'

/**
 * Las tres lentes de la app. El conmutador cambia entre ellas y con eso cambia
 * el acento, la composición de la card y qué datos se ponen adelante.
 *
 * `campo` es el token de color; el CSS lo aplica vía [data-modo] en la raíz.
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
    id: 'citas',
    etiqueta: 'Citas',
    titulo: 'Gente para salir',
    vacio: 'Por ahora no hay nadie más para mostrarte acá. Probá con otra lente o volvé más tarde.',
    like: 'Me gusta',
    match: 'también te dio like.',
  },
  {
    id: 'amistad',
    etiqueta: 'Amistad',
    titulo: 'Gente para juntarse',
    vacio: 'Se te acabó la gente en amistad. Volvé en un rato, siempre entra alguien nuevo.',
    like: 'Buena onda',
    match: 'también tiene ganas de juntarse.',
  },
  {
    id: 'estudio',
    etiqueta: 'Estudio',
    titulo: 'Gente para estudiar',
    vacio: 'No hay más compañeros de estudio por ahora. Cargá las materias que cursás para que aparezcan más.',
    like: 'Le entro',
    match: 'también quiere estudiar con vos.',
  },
]

export function definicion(id: Intencion): DefIntencion {
  const def = INTENCIONES.find((i) => i.id === id)
  if (def) return def
  // No se rompe la UI por un dato inesperado: un enum viejo o inválido en la
  // base (ver migración 0011) haría explotar cualquier pantalla que muestre la
  // etiqueta. Mejor un valor neutro y un aviso por consola.
  console.warn(`Intención desconocida: ${id}`)
  return {
    id,
    etiqueta: 'Match',
    titulo: 'Gente',
    vacio: 'Por ahora no hay nadie más para mostrarte acá.',
    like: 'Me gusta',
    match: 'también te dio like.',
  }
}
