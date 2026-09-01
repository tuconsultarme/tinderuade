import type { CandidatoConFotos, Genero, Intencion, MatchConPerfil, Mensaje, Perfil } from './tipos'

/**
 * MODO DEMO — para ver la app sin base de datos ni cuentas.
 *
 * Se activa con VITE_DEMO=1 (o `npm run dev:demo`). Cuando está prendido:
 *   - no hay login: se entra derecho al mazo
 *   - el mazo, los matches y el chat salen de este archivo, no de Supabase
 *   - el tercer "me gusta" arma un match, para poder ver la pantalla
 *
 * Es andamiaje, no producto. Para sacarlo: borrar este archivo y las tres
 * ramas `if (MODO_DEMO)` en useMazo.ts, useMatches.ts y paginas/Chat.tsx.
 */
export const MODO_DEMO = import.meta.env.VITE_DEMO === '1'

/* ============================================================
   Fotos de relleno
   ============================================================
   No hay fotos reales en el repo, así que se generan bloques SVG con las
   iniciales sobre el color del proyecto. Se ven como parte del diseño en vez
   de como un gris roto, y no hay que meter caras de gente que no dio permiso.
*/
const FLUOS = ['#FFA24D', '#D8F94F', '#66E8DC']

function retrato(nombre: string, variante: number): string {
  const iniciales = nombre
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const fondo = FLUOS[(nombre.length + variante) % FLUOS.length]
  // Bandas diagonales: sugieren el trazo de resaltador sin dibujar una cara.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
    <rect width="300" height="400" fill="#F8F8F4"/>
    <g transform="rotate(-24 150 200)">
      <rect x="-60" y="${60 + variante * 26}" width="420" height="54" fill="${fondo}"/>
      <rect x="-60" y="${210 + variante * 18}" width="420" height="30" fill="${fondo}" opacity="0.45"/>
    </g>
    <text x="150" y="215" font-family="Archivo, sans-serif" font-size="96" font-weight="800"
          text-anchor="middle" fill="#161A20">${iniciales}</text>
    <text x="150" y="255" font-family="DM Mono, monospace" font-size="15"
          letter-spacing="3" text-anchor="middle" fill="#5E6672">FOTO ${variante + 1}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function fotos(nombre: string, cantidad: number): string[] {
  return Array.from({ length: cantidad }, (_, i) => retrato(nombre, i))
}

/* ============================================================
   Gente
   ============================================================ */

interface FichaDemo extends Omit<CandidatoConFotos, 'materias_en_comun'> {
  intenciones: Intencion[]
  materias: number
  /** Hace falta para reproducir el filtro de `match` (no mostrar tu género). */
  genero: Genero
}

/** Carrera del perfil de prueba. Define a quién ves en la lente de estudio. */
const MI_CARRERA = 'Ingeniería en Informática'

const GENTE: FichaDemo[] = [
  {
    id: 'demo-1',
    nombre: 'Sofía',
    edad: 21,
    bio: 'Curso Multimedial en Monserrat. Siempre estoy organizando algo para el finde. Si sabés dónde comer bien y barato por el centro, contame.',
    carrera: 'Diseño Multimedial',
    sede: 'Monserrat',
    anio_ingreso: 2023,
    fotos: fotos('Sofía', 3),
    intenciones: ['match'],
    genero: 'femenino',
    materias: 0,
  },
  {
    id: 'demo-2',
    nombre: 'Tomás',
    edad: 23,
    bio: 'Ingeniería Informática, tercer año. Busco gente para armar grupo de TP y, si sale, para ir a ver a Racing.',
    carrera: 'Ingeniería en Informática',
    sede: 'Monserrat',
    anio_ingreso: 2021,
    fotos: fotos('Tomás', 2),
    intenciones: ['match', 'estudio'],
    genero: 'masculino',
    materias: 3,
  },
  {
    id: 'demo-3',
    nombre: 'Delfina',
    edad: 20,
    bio: 'Contador Público. Rindo Análisis Matemático II en dos semanas y necesito con quién sufrirlo.',
    carrera: 'Ingeniería en Informática',
    sede: 'Belgrano',
    anio_ingreso: 2024,
    fotos: fotos('Delfina', 4),
    intenciones: ['match', 'estudio'],
    genero: 'femenino',
    materias: 2,
  },
  {
    id: 'demo-4',
    nombre: 'Nacho',
    edad: 22,
    bio: 'Comunicación. Toco la guitarra mal pero con ganas. Voy a todos los recitales que puedo.',
    carrera: 'Comunicación',
    sede: 'Monserrat',
    anio_ingreso: 2022,
    fotos: fotos('Nacho', 2),
    intenciones: ['match'],
    genero: 'masculino',
    materias: 0,
  },
  {
    id: 'demo-5',
    nombre: 'Camila',
    edad: 24,
    bio: 'Administración de Empresas, última materia. Café, running en los bosques y planes tranquilos.',
    carrera: 'Ingeniería en Informática',
    sede: 'Belgrano',
    anio_ingreso: 2020,
    fotos: fotos('Camila', 3),
    intenciones: ['match', 'estudio'],
    genero: 'femenino',
    materias: 1,
  },
  {
    id: 'demo-6',
    nombre: 'Bauti',
    edad: 21,
    bio: 'Ingeniería Industrial. Juego al fútbol 5 los martes y siempre falta uno.',
    carrera: 'Ingeniería en Informática',
    sede: 'Monserrat',
    anio_ingreso: 2023,
    fotos: fotos('Bauti', 2),
    intenciones: ['match', 'estudio'],
    genero: 'masculino',
    materias: 4,
  },
  {
    id: 'demo-7',
    nombre: 'Juli',
    edad: 22,
    bio: 'Psicología. Me gusta cocinar para mucha gente y que sobre comida.',
    carrera: 'Ingeniería en Informática',
    sede: 'Belgrano',
    anio_ingreso: 2022,
    fotos: fotos('Juli', 3),
    intenciones: ['match', 'estudio'],
    genero: 'femenino',
    materias: 1,
  },
  {
    id: 'demo-8',
    nombre: 'Fede',
    edad: 25,
    bio: 'Abogacía, cursando de noche porque trabajo. Busco compañeros para la final de Procesal.',
    carrera: 'Ingeniería en Informática',
    sede: 'Monserrat',
    anio_ingreso: 2019,
    fotos: fotos('Fede', 2),
    intenciones: ['estudio'],
    genero: 'masculino',
    materias: 5,
  },
]

/** Candidatos de una lente, con las materias en común ya resueltas. */
/**
 * Reproduce los mismos filtros que `get_candidatos()` en la base, para que el
 * demo no muestre gente que en la app real no aparecería:
 *   match   → nadie de tu mismo género
 *   estudio → solo tu misma carrera
 */
export function candidatosDemo(modo: Intencion): CandidatoConFotos[] {
  return GENTE.filter((f) => {
    if (!f.intenciones.includes(modo)) return false
    if (modo === 'match') return f.genero !== PERFIL_DEMO.genero
    return f.carrera === MI_CARRERA
  }).map((f) => ({
    id: f.id,
    nombre: f.nombre,
    edad: f.edad,
    bio: f.bio,
    carrera: f.carrera,
    sede: f.sede,
    anio_ingreso: f.anio_ingreso,
    fotos: f.fotos,
    // Las materias en común solo tienen sentido en la lente de estudio.
    materias_en_comun: modo === 'estudio' ? f.materias : 0,
  }))
}

/* ============================================================
   Vos
   ============================================================ */

export const MI_ID_DEMO = 'demo-yo'

/** Las lentes del perfil de prueba. Con las dos, el conmutador se ve entero. */
export const INTENCIONES_DEMO: Intencion[] = ['match', 'estudio']

export const PERFIL_DEMO: Perfil = {
  id: MI_ID_DEMO,
  nombre: 'Vos',
  fecha_nacimiento: '2003-04-12',
  genero: 'masculino',
  busca_generos: [],
  bio: 'Este es el perfil de prueba del modo demo.',
  carrera_id: 1, // Ingeniería en Informática, ver MI_CARRERA
  sede_id: null,
  anio_ingreso: 2022,
  instagram: 'tuusuario',
  edad_min: 18,
  edad_max: 35,
  onboarding_completo: true,
  activo: true,
  ultima_actividad: new Date().toISOString(),
}

/* ============================================================
   Matches y chat en memoria
   ============================================================
   Viven en un módulo y no en estado de React para que sobrevivan al ir y
   volver entre el mazo, la lista y el chat.
*/

interface MatchDemo {
  id: string
  otroId: string
  intencion: Intencion
  created_at: string
}

const matchesDemo: MatchDemo[] = [
  {
    id: 'demo-match-inicial',
    otroId: 'demo-2',
    intencion: 'estudio',
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
  },
]

const mensajesDemo = new Map<string, Mensaje[]>([
  [
    'demo-match-inicial',
    [
      {
        id: 1,
        match_id: 'demo-match-inicial',
        emisor_id: 'demo-2',
        contenido: '¡Buenísimo! ¿Vos también cursás Base de Datos con Pérez?',
        leido_at: null,
        created_at: new Date(Date.now() - 80_000_000).toISOString(),
      },
      {
        id: 2,
        match_id: 'demo-match-inicial',
        emisor_id: MI_ID_DEMO,
        contenido: 'Sí, la comisión de los martes. ¿Arrancaste el TP?',
        leido_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 79_000_000).toISOString(),
      },
      {
        id: 3,
        match_id: 'demo-match-inicial',
        emisor_id: 'demo-2',
        contenido: 'Ni empecé jaja. ¿Lo armamos juntos?',
        leido_at: null,
        created_at: new Date(Date.now() - 3_600_000).toISOString(),
      },
    ],
  ],
])

/** Cada tantos likes se arma un match, para poder ver esa pantalla. */
const CADA_CUANTOS_LIKES = 3
let likesDemo = 0

export function registrarLikeDemo(otroId: string, intencion: Intencion): string | null {
  likesDemo += 1
  if (likesDemo % CADA_CUANTOS_LIKES !== 0) return null

  const id = `demo-match-${otroId}-${intencion}`
  if (!matchesDemo.some((m) => m.id === id)) {
    matchesDemo.unshift({ id, otroId, intencion, created_at: new Date().toISOString() })
    mensajesDemo.set(id, [])
  }
  return id
}

/* ============================================================
   Cupo de likes (demo)
   ============================================================ */

const LIMITE_DEMO = 25
let likesUsadosDemo = 0

export function cupoDemo() {
  return {
    usados: likesUsadosDemo,
    restantes: Math.max(0, LIMITE_DEMO - likesUsadosDemo),
    ilimitado: false,
  }
}

export function consumirLikeDemo(): void {
  likesUsadosDemo += 1
}

/** Deshace el conteo de un "me gusta" para que la cuenta hacia el próximo
 *  match demo quede como si nunca se hubiera dado. Solo se llama cuando ESE
 *  like no armó un match (ver "deshacer" en useMazo.ts). */
export function deshacerLikeDemo(): void {
  likesDemo = Math.max(0, likesDemo - 1)
}

export function matchesConPerfilDemo(): MatchConPerfil[] {
  return matchesDemo.map((m) => {
    const otro = GENTE.find((g) => g.id === m.otroId)
    const msgs = mensajesDemo.get(m.id) ?? []
    return {
      id: m.id,
      intencion: m.intencion,
      created_at: m.created_at,
      otro: {
        id: m.otroId,
        nombre: otro?.nombre ?? 'Alguien',
        foto: otro?.fotos[0] ?? null,
      },
      ultimoMensaje: msgs.length > 0 ? msgs[msgs.length - 1] : null,
      sinLeer: msgs.filter((x) => x.emisor_id !== MI_ID_DEMO && !x.leido_at).length,
    }
  })
}

export function mensajesDeMatchDemo(matchId: string): Mensaje[] {
  return mensajesDemo.get(matchId) ?? []
}

export function cabeceraDemo(matchId: string) {
  const match = matchesDemo.find((m) => m.id === matchId)
  if (!match) return null
  const otro = GENTE.find((g) => g.id === match.otroId)
  return {
    nombre: otro?.nombre ?? 'Alguien',
    foto: otro?.fotos[0] ?? null,
    otroId: match.otroId,
    intencion: match.intencion,
  }
}

export function enviarMensajeDemo(matchId: string, contenido: string): Mensaje {
  const previos = mensajesDemo.get(matchId) ?? []
  const nuevo: Mensaje = {
    id: Date.now(),
    match_id: matchId,
    emisor_id: MI_ID_DEMO,
    contenido,
    leido_at: null,
    created_at: new Date().toISOString(),
  }
  mensajesDemo.set(matchId, [...previos, nuevo])
  return nuevo
}

export function marcarLeidosDemo(matchId: string): void {
  const previos = mensajesDemo.get(matchId) ?? []
  mensajesDemo.set(
    matchId,
    previos.map((m) =>
      m.emisor_id === MI_ID_DEMO || m.leido_at ? m : { ...m, leido_at: new Date().toISOString() },
    ),
  )
}

export function perfilDetalleDemo(perfilId: string) {
  const g = GENTE.find((x) => x.id === perfilId)
  if (!g) return null
  return {
    nombre: g.nombre,
    edad: g.edad,
    bio: g.bio,
    carrera: g.carrera,
    sede: g.sede,
    anio_ingreso: g.anio_ingreso,
    instagram: g.nombre.toLowerCase().replace(/[^a-z]/g, ''),
    fotos: g.fotos,
  }
}

export function hayMatchDemo(perfilId: string): boolean {
  return matchesDemo.some((m) => m.otroId === perfilId)
}
