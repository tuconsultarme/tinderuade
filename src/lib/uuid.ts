/**
 * UUID v4 que también funciona fuera de contexto seguro.
 *
 * `crypto.randomUUID()` solo existe en contextos seguros: https o localhost.
 * Al probar desde el celular contra `http://192.168.x.x:5180` no está
 * definido, y rompía la subida de fotos y el canal de realtime con un
 * "crypto.randomUUID is not a function".
 *
 * `crypto.getRandomValues()` sí está disponible siempre, así que el respaldo
 * arma el v4 a mano con la misma calidad de aleatoriedad.
 */
export function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  // Versión 4 y variante RFC 4122, que es lo que distingue a un v4 válido.
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80

  const hex = [...b].map((n) => n.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
