import { createClient } from '@supabase/supabase-js'
import { MODO_DEMO } from './demo'

// En demo nunca se llama a la red, así que valores de relleno alcanzan y la
// app arranca sin .env.local. Fuera de demo, faltar las claves es un error
// que conviene que reviente acá y no en la primera consulta.
const url = import.meta.env.VITE_SUPABASE_URL ?? (MODO_DEMO ? 'http://demo.local' : undefined)
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? (MODO_DEMO ? 'demo' : undefined)

if (!url || !anonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local. ' +
      'Copiá .env.local.example y completá las claves del proyecto, ' +
      'o probá la app sin base con: npm run dev:demo',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const SUPABASE_URL = url
export const SUPABASE_ANON_KEY = anonKey
