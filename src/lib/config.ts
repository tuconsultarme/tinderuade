/**
 * Configuración de producto que no vive en la base de datos.
 */

/**
 * Dominio de mail exigido para registrarse.
 *
 * En el kickoff se decidió **mail libre**: cualquiera puede crear cuenta y
 * declara su carrera y sede, sin garantía de que sea de la facultad. El brief
 * posterior pedía restringir a `@uade.edu.ar`, así que queda como un flag de
 * una línea en vez de una decisión enterrada en el código.
 *
 * Poner `'uade.edu.ar'` para exigir el dominio. `null` = mail libre.
 */
export const DOMINIO_MAIL_REQUERIDO: string | null = null

/** Tope de fotos por perfil. Lo impone también un trigger en la base. */
export const MAX_FOTOS = 6

/** Cuántos candidatos pide el mazo por tanda. */
export const TAMANO_TANDA = 20

/** Cuántas cards quedan sin swipear antes de pedir la tanda siguiente. */
export const UMBRAL_RECARGA = 4

/** Segundos de validez de las signed URLs de las fotos. */
export const VENCIMIENTO_URL_FOTO = 60 * 60
