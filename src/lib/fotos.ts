import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase'
import { VENCIMIENTO_URL_FOTO } from './config'
import { uuid } from './uuid'
import type { Foto } from './tipos'

const BUCKET = 'fotos-perfil'
const BUCKET_CHAT = 'fotos-chat'

/**
 * Las subidas van por fetch directo al endpoint REST de Storage, no por
 * `supabase.storage.from().upload()`: el SDK ya dio errores en runtime en otro
 * proyecto y el fetch crudo resultó confiable.
 *
 * Diferencia con aquella implementación: allá era una API route del servidor
 * con la service_role key. Acá no hay servidor — es una SPA — así que va el
 * access token del propio usuario. Es lo correcto además de lo único seguro:
 * la política de `0004_storage.sql` exige que la primera carpeta del path sea
 * `auth.uid()`, así que el JWT del usuario autoriza exactamente su carpeta y
 * nada más. La service_role en el browser saltearía la RLS entera.
 */
async function tokenDeSesion(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('No hay sesión activa')
  return token
}

/**
 * Las fotos de celular vienen de 3 a 8 MB y el bucket corta en 5 MB.
 * Reescalar en el cliente evita el rechazo y hace que el mazo cargue rápido
 * con datos móviles.
 */
async function comprimir(file: File, ladoMax = 1440, calidad = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height))
  const ancho = Math.round(bitmap.width * escala)
  const alto = Math.round(bitmap.height * escala)

  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, ancho, alto)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', calidad),
  )
  // Si el navegador no sabe exportar webp, el archivo original sirve igual.
  return blob ?? file
}

/**
 * Sube una foto y registra la fila en `fotos`.
 * El `orden` define la posición en el carrusel del perfil (0 = principal).
 */
export async function subirFoto(userId: string, file: File, orden: number): Promise<Foto> {
  const blob = await comprimir(file)
  const path = `${userId}/${uuid()}.webp`
  const token = await tokenDeSesion()

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'image/webp',
      'x-upsert': 'true',
    },
    body: blob,
  })

  if (!res.ok) {
    const detalle = await res.text().catch(() => '')
    throw new Error(`No se pudo subir la foto (${res.status}). ${detalle}`)
  }

  // El archivo ya está en el bucket; si falla el insert queda huérfano, así que
  // lo borramos para no dejar basura que igual cuenta contra la cuota.
  const { data, error } = await supabase
    .from('fotos')
    .insert({ profile_id: userId, storage_path: path, orden })
    .select()
    .single()

  if (error) {
    await borrarDelBucket(path).catch(() => {})
    throw new Error(`No se pudo registrar la foto: ${error.message}`)
  }

  return data as Foto
}

async function borrarDelBucket(path: string): Promise<void> {
  const token = await tokenDeSesion()
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
  })
}

export async function borrarFoto(foto: Foto): Promise<void> {
  const { error } = await supabase.from('fotos').delete().eq('id', foto.id)
  if (error) throw new Error(`No se pudo borrar la foto: ${error.message}`)
  await borrarDelBucket(foto.storage_path).catch(() => {
    // La fila ya no está: si el archivo quedó, es basura silenciosa, no un
    // error que valga la pena mostrarle a la persona.
  })
}

/**
 * El bucket es privado, así que cada lectura necesita una URL firmada.
 * Se piden todas juntas en un solo request: el mazo muestra hasta 6 fotos por
 * candidato y de a una sería una tormenta de llamadas.
 */
export async function urlsFirmadas(
  paths: string[],
  bucket: string = BUCKET,
): Promise<Map<string, string>> {
  const mapa = new Map<string, string>()
  if (paths.length === 0) return mapa

  const token = await tokenDeSesion()
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${bucket}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paths, expiresIn: VENCIMIENTO_URL_FOTO }),
  })

  if (!res.ok) return mapa

  const firmadas: { path: string; signedURL: string | null }[] = await res.json()
  for (const f of firmadas) {
    if (f.signedURL) mapa.set(f.path, `${SUPABASE_URL}/storage/v1${f.signedURL}`)
  }
  return mapa
}

/**
 * Reordena el carrusel. `ids` va en el orden final deseado: el primero es la
 * foto principal.
 *
 * Va por RPC y no por UPDATEs sueltos porque la unique (profile_id, orden)
 * hace que toda permutación pase por un estado intermedio inválido, y desde
 * el cliente no hay transacción para cubrirlo. Ver `0005_reordenar_fotos.sql`.
 */
export async function reordenarFotos(ids: string[]): Promise<void> {
  const { error } = await supabase.rpc('reordenar_fotos', { p_ids: ids })
  if (error) throw new Error(`No se pudo reordenar: ${error.message}`)
}

/**
 * Sube una imagen al bucket privado del chat y devuelve su path.
 *
 * Convención de path: {match_id}/{uuid}.webp — la primera carpeta es el match,
 * y la política de `0008_chat_rico.sql` solo deja subir a sus participantes.
 * No registra fila: la referencia la guarda el propio mensaje (imagen_path).
 */
export async function subirImagenChat(matchId: string, file: File): Promise<string> {
  const blob = await comprimir(file)
  const path = `${matchId}/${uuid()}.webp`
  const token = await tokenDeSesion()

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET_CHAT}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'image/webp',
      'x-upsert': 'true',
    },
    body: blob,
  })

  if (!res.ok) {
    const detalle = await res.text().catch(() => '')
    throw new Error(`No se pudo subir la imagen (${res.status}). ${detalle}`)
  }

  return path
}

/** Firma URLs de imágenes del chat (bucket privado fotos-chat). */
export function urlsFirmadasChat(paths: string[]): Promise<Map<string, string>> {
  return urlsFirmadas(paths, BUCKET_CHAT)
}
