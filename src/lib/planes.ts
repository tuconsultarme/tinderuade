/**
 * Planes de suscripción. Por ahora los pagos son una demo: apretar "Comprar"
 * activa el plan directo. El plan vive en la base (columna profiles.plan) para
 * poder mostrar la insignia también en el perfil de los demás.
 */

export type Plan = 'gratis' | 'plus' | 'gold'

/** Cuántos "me gusta" por día tiene el plan gratis. Plus y Gold, ilimitados. */
export const LIMITE_LIKES_GRATIS = 20

export interface DefPlan {
  id: Plan
  nombre: string
  precio: string
  destacado?: boolean
  beneficios: string[]
}

export const PLANES: DefPlan[] = [
  {
    id: 'gratis',
    nombre: 'Gratis',
    precio: '$0',
    beneficios: [`${LIMITE_LIKES_GRATIS} likes por día`, 'Chat con tus matches', 'Las tres lentes'],
  },
  {
    id: 'plus',
    nombre: 'Plus',
    precio: '$2.500 / mes',
    destacado: true,
    beneficios: ['Likes ilimitados', 'Deshacer swipes', 'Insignia Plus en tu perfil'],
  },
  {
    id: 'gold',
    nombre: 'Gold',
    precio: '$4.900 / mes',
    beneficios: ['Todo lo de Plus', 'Ves quién te dio like', 'Insignia Gold en tu perfil'],
  },
]

export interface Capacidades {
  /** Sin límite diario de "me gusta". */
  likesIlimitados: boolean
  /** Puede usar el botón de deshacer del mazo. */
  puedeDeshacer: boolean
  /** Ve los nombres/perfiles en "Matches recibidos". */
  veQuienTeDioLike: boolean
}

export function capacidadesDe(plan: Plan): Capacidades {
  return {
    likesIlimitados: plan !== 'gratis',
    puedeDeshacer: plan !== 'gratis',
    veQuienTeDioLike: plan === 'gold',
  }
}

/** Etiqueta del plan. Null en gratis (sin distintivo). */
export function etiquetaPlan(plan: Plan): string | null {
  if (plan === 'plus') return 'Plus'
  if (plan === 'gold') return 'Gold'
  return null
}

/** Color con que se pinta el nombre según el plan: dorado Gold, naranja Plus. */
export function colorPlan(plan: Plan): string | null {
  if (plan === 'gold') return '#E8B307' // dorado
  if (plan === 'plus') return '#FF6036' // naranja
  return null
}

/** Estilo listo para el nombre; vacío en gratis (color heredado). */
export function estiloNombre(plan: Plan): { color?: string } {
  const c = colorPlan(plan)
  return c ? { color: c } : {}
}

/** Normaliza cualquier valor (de la base o vieja) a un plan conocido. */
export function comoPlan(valor: unknown): Plan {
  return valor === 'plus' || valor === 'gold' ? valor : 'gratis'
}

// ---- Contador diario de likes (gratis) ----
// Vive en localStorage: es una comodidad del cliente para el límite del plan
// gratis, no un control de seguridad. Se reinicia solo al cambiar el día.

function claveHoy(): string {
  return `likes-${new Date().toISOString().slice(0, 10)}`
}

export function likesUsadosHoy(): number {
  if (typeof localStorage === 'undefined') return 0
  return Number(localStorage.getItem(claveHoy()) ?? '0')
}

export function registrarLikeHoy(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(claveHoy(), String(likesUsadosHoy() + 1))
}

/** Likes que quedan hoy; null = ilimitado. */
export function likesRestantes(plan: Plan): number | null {
  if (capacidadesDe(plan).likesIlimitados) return null
  return Math.max(0, LIMITE_LIKES_GRATIS - likesUsadosHoy())
}
