/**
 * Siembra perfiles de prueba en el Supabase real.
 *
 *   node scripts/seed-demo.mjs                    -> crea los perfiles
 *   node scripts/seed-demo.mjs tu@mail.com        -> además te dejan like puesto
 *
 * Con el segundo argumento, los perfiles de prueba te dan like de antemano en
 * todas las intenciones que compartan con vos. Así, la primera vez que vos les
 * des like, el match salta en el momento y podés ver esa pantalla sin necesitar
 * una segunda persona.
 *
 * Usa la service_role key, que saltea la RLS entera. Por eso corre en tu
 * máquina y lee la clave de .env.local (que está en .gitignore). Nunca la
 * pongas en el navegador.
 *
 * Es idempotente: si lo corrés dos veces no duplica nada.
 */

import { readFileSync } from 'node:fs'
import { retrato } from './png.mjs'

/* ---------- config ---------- */

function leerEnv() {
  let texto
  try {
    texto = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  } catch {
    salir('No encontré .env.local. Copiá .env.local.example y completalo.')
  }
  const env = {}
  for (const linea of texto.split('\n')) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return env
}

function salir(mensaje) {
  console.error(`\n  ✗ ${mensaje}\n`)
  process.exit(1)
}

const env = leerEnv()
const URL_BASE = env.VITE_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL
const CLAVE = env.SUPABASE_SERVICE_ROLE_KEY

if (!URL_BASE) salir('Falta VITE_SUPABASE_URL en .env.local.')
if (!CLAVE) {
  salir(
    'Falta SUPABASE_SERVICE_ROLE_KEY en .env.local.\n' +
      '    Está en Supabase → Project Settings → API → "service_role".\n' +
      '    Ojo: esa clave saltea toda la seguridad. Solo va en .env.local (gitignored),\n' +
      '    nunca con prefijo VITE_ ni en el navegador.',
  )
}

const CLAVE_DE_PRUEBA = 'uadencuentros-demo-2026'

const cabeceras = {
  apikey: CLAVE,
  Authorization: `Bearer ${CLAVE}`,
  'Content-Type': 'application/json',
}

async function api(ruta, opciones = {}) {
  const res = await fetch(`${URL_BASE}${ruta}`, {
    ...opciones,
    headers: { ...cabeceras, ...(opciones.headers ?? {}) },
  })
  const texto = await res.text()
  let cuerpo = null
  try {
    cuerpo = texto ? JSON.parse(texto) : null
  } catch {
    cuerpo = texto
  }
  return { ok: res.ok, status: res.status, cuerpo }
}

/* ---------- la gente ---------- */

const GENTE = [
  {
    mail: 'sofia.demo@uadencuentros.test',
    nombre: 'Sofía',
    nacimiento: '2004-06-14',
    genero: 'femenino',
    carrera: 'Diseño Multimedial',
    sede: 'Monserrat',
    anio: 2023,
    bio: 'Curso Multimedial en Monserrat. Siempre estoy organizando algo para el finde. Si sabés dónde comer bien y barato por el centro, contame.',
    intenciones: ['citas', 'amistad'],
    fotos: 3,
  },
  {
    mail: 'tomas.demo@uadencuentros.test',
    nombre: 'Tomás',
    nacimiento: '2002-02-03',
    genero: 'masculino',
    carrera: 'Ingeniería en Informática',
    sede: 'Monserrat',
    anio: 2021,
    bio: 'Ingeniería Informática, tercer año. Busco gente para armar grupo de TP y, si sale, para ir a ver a Racing.',
    intenciones: ['amistad', 'estudio'],
    fotos: 2,
  },
  {
    mail: 'delfina.demo@uadencuentros.test',
    nombre: 'Delfina',
    nacimiento: '2005-09-22',
    genero: 'femenino',
    carrera: 'Contador Público',
    sede: 'Belgrano',
    anio: 2024,
    bio: 'Contador Público. Rindo Análisis Matemático II en dos semanas y necesito con quién sufrirlo.',
    intenciones: ['estudio', 'citas'],
    fotos: 4,
  },
  {
    mail: 'nacho.demo@uadencuentros.test',
    nombre: 'Nacho',
    nacimiento: '2003-11-30',
    genero: 'masculino',
    carrera: 'Comunicación',
    sede: 'Monserrat',
    anio: 2022,
    bio: 'Comunicación. Toco la guitarra mal pero con ganas. Voy a todos los recitales que puedo.',
    intenciones: ['citas', 'amistad'],
    fotos: 2,
  },
  {
    mail: 'camila.demo@uadencuentros.test',
    nombre: 'Camila',
    nacimiento: '2001-04-08',
    genero: 'femenino',
    carrera: 'Administración de Empresas',
    sede: 'Belgrano',
    anio: 2020,
    bio: 'Administración, última materia. Café, running en los bosques y planes tranquilos.',
    intenciones: ['citas', 'estudio'],
    fotos: 3,
  },
  {
    mail: 'bauti.demo@uadencuentros.test',
    nombre: 'Bauti',
    nacimiento: '2004-01-19',
    genero: 'masculino',
    carrera: 'Ingeniería Industrial',
    sede: 'Monserrat',
    anio: 2023,
    bio: 'Ingeniería Industrial. Juego al fútbol 5 los martes y siempre falta uno.',
    intenciones: ['amistad', 'estudio'],
    fotos: 2,
  },
]

/* ---------- pasos ---------- */

async function catalogos() {
  const [carreras, sedes] = await Promise.all([
    api('/rest/v1/carreras?select=id,nombre'),
    api('/rest/v1/sedes?select=id,nombre'),
  ])
  const mapa = (filas) => new Map((filas ?? []).map((f) => [f.nombre, f.id]))
  return { carreras: mapa(carreras.cuerpo), sedes: mapa(sedes.cuerpo) }
}

/** Crea el usuario de auth, o devuelve el existente si ya estaba. */
async function usuario(mail) {
  const alta = await api('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: mail,
      password: CLAVE_DE_PRUEBA,
      // Sin esto quedan pendientes de confirmar y no se pueden usar.
      email_confirm: true,
    }),
  })
  if (alta.ok) return alta.cuerpo.id

  const busca = await api(`/auth/v1/admin/users?filter=${encodeURIComponent(mail)}`)
  const encontrado = (busca.cuerpo?.users ?? []).find((u) => u.email === mail)
  if (encontrado) return encontrado.id

  salir(`No pude crear ni encontrar el usuario ${mail}: ${JSON.stringify(alta.cuerpo)}`)
}

async function perfil(id, ficha, cat) {
  const res = await api('/rest/v1/profiles', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      id,
      nombre: ficha.nombre,
      fecha_nacimiento: ficha.nacimiento,
      genero: ficha.genero,
      // Vacío = sin preferencia de género, así aparecen para cualquiera.
      busca_generos: [],
      bio: ficha.bio,
      carrera_id: cat.carreras.get(ficha.carrera) ?? null,
      sede_id: cat.sedes.get(ficha.sede) ?? null,
      anio_ingreso: ficha.anio,
      edad_min: 18,
      edad_max: 99,
      onboarding_completo: true,
      activo: true,
    }),
  })
  if (!res.ok) salir(`No pude crear el perfil de ${ficha.nombre}: ${JSON.stringify(res.cuerpo)}`)

  await api(`/rest/v1/profile_intenciones?profile_id=eq.${id}`, { method: 'DELETE' })
  const int = await api('/rest/v1/profile_intenciones', {
    method: 'POST',
    body: JSON.stringify(ficha.intenciones.map((i) => ({ profile_id: id, intencion: i }))),
  })
  if (!int.ok) salir(`No pude cargar las intenciones de ${ficha.nombre}: ${JSON.stringify(int.cuerpo)}`)
}

async function fotos(id, ficha, semilla) {
  const yaTiene = await api(`/rest/v1/fotos?profile_id=eq.${id}&select=id`)
  if ((yaTiene.cuerpo ?? []).length > 0) return 0

  let subidas = 0
  for (let orden = 0; orden < ficha.fotos; orden++) {
    const imagen = retrato(semilla, orden)
    const ruta = `${id}/demo-${orden}.png`

    const sub = await fetch(`${URL_BASE}/storage/v1/object/fotos-perfil/${ruta}`, {
      method: 'POST',
      headers: {
        apikey: CLAVE,
        Authorization: `Bearer ${CLAVE}`,
        'Content-Type': 'image/png',
        'x-upsert': 'true',
      },
      body: imagen,
    })
    if (!sub.ok) salir(`No pude subir la foto de ${ficha.nombre}: ${await sub.text()}`)

    const fila = await api('/rest/v1/fotos', {
      method: 'POST',
      body: JSON.stringify({ profile_id: id, storage_path: ruta, orden }),
    })
    if (!fila.ok) salir(`No pude registrar la foto de ${ficha.nombre}: ${JSON.stringify(fila.cuerpo)}`)
    subidas++
  }
  return subidas
}

/** Los perfiles de prueba te dan like, así el match salta cuando vos les das. */
async function likesHacia(mailDestino, creados) {
  const busca = await api(`/auth/v1/admin/users?filter=${encodeURIComponent(mailDestino)}`)
  const vos = (busca.cuerpo?.users ?? []).find((u) => u.email === mailDestino)
  if (!vos) salir(`No encontré ninguna cuenta con el mail ${mailDestino}. ¿Ya te registraste en la app?`)

  const mias = await api(
    `/rest/v1/profile_intenciones?profile_id=eq.${vos.id}&select=intencion`,
  )
  const misIntenciones = new Set((mias.cuerpo ?? []).map((r) => r.intencion))
  if (misIntenciones.size === 0) {
    salir(
      `La cuenta ${mailDestino} existe pero no terminó el onboarding.\n` +
        '    Completalo en la app y volvé a correr el script.',
    )
  }

  let puestos = 0
  for (const { id, ficha } of creados) {
    for (const intencion of ficha.intenciones) {
      if (!misIntenciones.has(intencion)) continue
      const res = await api('/rest/v1/swipes', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify({
          emisor_id: id,
          receptor_id: vos.id,
          direccion: 'like',
          intencion,
        }),
      })
      if (res.ok) puestos++
    }
  }
  return { puestos, intenciones: [...misIntenciones] }
}

/**
 * Borra las cuentas de prueba. El `on delete cascade` de profiles se lleva
 * perfil, intenciones, fotos, swipes, matches y mensajes; los archivos del
 * bucket hay que sacarlos aparte porque storage no cuelga de esa FK.
 */
async function borrarTodo() {
  let borradas = 0
  for (const ficha of GENTE) {
    const busca = await api(`/auth/v1/admin/users?filter=${encodeURIComponent(ficha.mail)}`)
    const u = (busca.cuerpo?.users ?? []).find((x) => x.email === ficha.mail)
    if (!u) continue

    const archivos = await api(`/rest/v1/fotos?profile_id=eq.${u.id}&select=storage_path`)
    for (const f of archivos.cuerpo ?? []) {
      await fetch(`${URL_BASE}/storage/v1/object/fotos-perfil/${f.storage_path}`, {
        method: 'DELETE',
        headers: { apikey: CLAVE, Authorization: `Bearer ${CLAVE}` },
      })
    }

    await api(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' })
    console.log(`  ✓ borrada ${ficha.nombre}`)
    borradas++
  }
  console.log(`\n  ${borradas} cuentas de prueba borradas.\n`)
}

/* ---------- main ---------- */

const arg = process.argv[2] ?? null

if (arg === '--borrar') {
  console.log(`\n  Borrando cuentas de prueba de ${URL_BASE}\n`)
  await borrarTodo()
  process.exit(0)
}

const mailDestino = arg

console.log(`\n  Sembrando en ${URL_BASE}\n`)

const cat = await catalogos()
if (cat.carreras.size === 0) {
  console.log('  ! Los catálogos están vacíos. ¿Corriste seed.sql? Sigo igual, sin carrera ni sede.\n')
}

const creados = []
for (const [i, ficha] of GENTE.entries()) {
  const id = await usuario(ficha.mail)
  await perfil(id, ficha, cat)
  const n = await fotos(id, ficha, i)
  creados.push({ id, ficha })
  console.log(`  ✓ ${ficha.nombre.padEnd(9)} ${ficha.intenciones.join(', ').padEnd(18)} ${n > 0 ? `${n} fotos` : 'fotos ya estaban'}`)
}

console.log(`\n  ${creados.length} perfiles listos.`)

if (mailDestino) {
  const { puestos, intenciones } = await likesHacia(mailDestino, creados)
  console.log(`  ${puestos} likes puestos hacia ${mailDestino} (${intenciones.join(', ')}).`)
  console.log('  Dales like a cualquiera de ellos y el match salta en el momento.')
} else {
  console.log('\n  Para que además te dejen like puesto y puedas ver la pantalla de match:')
  console.log('    node scripts/seed-demo.mjs tu@mail.com')
}

console.log(`\n  Las cuentas de prueba entran con la contraseña: ${CLAVE_DE_PRUEBA}`)
console.log('  Para borrarlas después: node scripts/seed-demo.mjs --borrar\n')
