import { deflateSync } from 'node:zlib'

/**
 * Codificador de PNG mínimo, sin dependencias.
 *
 * Hace falta porque el bucket solo acepta image/jpeg, image/png y image/webp:
 * un SVG lo rechaza. Y traer sharp o canvas para dibujar cuatro rectángulos
 * sería una dependencia nativa entera para el script de datos de prueba.
 */

const TABLA_CRC = (() => {
  const tabla = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabla[n] = c
  }
  return tabla
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = TABLA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(tipo, datos) {
  const largo = Buffer.alloc(4)
  largo.writeUInt32BE(datos.length)
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(cuerpo))
  return Buffer.concat([largo, cuerpo, crc])
}

/** `pintar(x, y)` devuelve [r, g, b] para cada píxel. */
export function png(ancho, alto, pintar) {
  const filas = Buffer.alloc(alto * (1 + ancho * 3))
  let p = 0
  for (let y = 0; y < alto; y++) {
    filas[p++] = 0 // filtro "none"
    for (let x = 0; x < ancho; x++) {
      const [r, g, b] = pintar(x, y)
      filas[p++] = r
      filas[p++] = g
      filas[p++] = b
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(ancho, 0)
  ihdr.writeUInt32BE(alto, 4)
  ihdr[8] = 8 // 8 bits por canal
  ihdr[9] = 2 // color type 2 = RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(filas, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const hexARgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

const PAPEL = hexARgb('#F8F8F4')
const FLUOS = ['#FFA24D', '#D8F94F', '#66E8DC'].map(hexARgb)

/**
 * Retrato de relleno: bandas diagonales de resaltador sobre papel.
 * Sin caras ni fotos de nadie, y coherente con la paleta del proyecto.
 */
export function retrato(semilla, variante, ancho = 900, alto = 1200) {
  const fluo = FLUOS[(semilla + variante) % FLUOS.length]
  const claro = fluo.map((c) => Math.round(c + (255 - c) * 0.55))

  // Bandas perpendiculares a una diagonal, desplazadas por la variante.
  const corrimiento = variante * 190 + semilla * 70

  return png(ancho, alto, (x, y) => {
    const d = (x * 0.72 + y * 0.69 + corrimiento) % 620
    if (d < 150) return fluo
    if (d < 260) return claro
    return PAPEL
  })
}
