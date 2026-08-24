import { useRef, useState } from 'react'
import { subirFoto, borrarFoto, reordenarFotos } from '@/lib/fotos'
import { MAX_FOTOS } from '@/lib/config'
import { Aviso } from './ui/Estados'
import type { Foto } from '@/lib/tipos'

interface Props {
  userId: string
  fotos: Foto[]
  urls: Map<string, string>
  onCambio: () => Promise<void>
}

/**
 * Alta, baja y reordenamiento de las fotos del perfil.
 *
 * El reordenamiento va con botones de mover y no con drag & drop: en un celular
 * el drag pelea con el scroll de la página, y "hacer principal" es la única
 * operación que la gente hace de verdad.
 */
export function GestorFotos({ userId, fotos, urls, onCambio }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lugaresLibres = MAX_FOTOS - fotos.length

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const elegidas = Array.from(e.target.files ?? []).slice(0, lugaresLibres)
    // Permite volver a elegir el mismo archivo si la subida falló.
    e.target.value = ''
    if (elegidas.length === 0) return

    setSubiendo(true)
    setError(null)

    try {
      // En serie y no en paralelo: la unique (profile_id, orden) hace que dos
      // inserts simultáneos peleen por la misma posición.
      let orden = fotos.length
      for (const archivo of elegidas) {
        await subirFoto(userId, archivo, orden)
        orden += 1
      }
      await onCambio()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto.')
    } finally {
      setSubiendo(false)
    }
  }

  async function quitar(foto: Foto) {
    setError(null)
    try {
      await borrarFoto(foto)
      // Renumerar para no dejar huecos en el orden.
      const quedan = fotos.filter((f) => f.id !== foto.id).map((f) => f.id)
      if (quedan.length > 0) await reordenarFotos(quedan)
      await onCambio()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar la foto.')
    }
  }

  async function hacerPrincipal(foto: Foto) {
    setError(null)
    try {
      const ids = [foto.id, ...fotos.filter((f) => f.id !== foto.id).map((f) => f.id)]
      await reordenarFotos(ids)
      await onCambio()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reordenar.')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <p className="dato text-grafito">Fotos</p>
        <p className="dato text-grafito tabular">
          {fotos.length} / {MAX_FOTOS}
        </p>
      </div>

      <ul className="grid grid-cols-3 gap-2">
        {fotos.map((foto, i) => (
          <li
            key={foto.id}
            className="relative aspect-[3/4] rounded-chip overflow-hidden border border-lapiz bg-lapiz/40"
          >
            <img
              src={urls.get(foto.storage_path) ?? ''}
              alt={i === 0 ? 'Tu foto principal' : `Tu foto ${i + 1}`}
              loading="lazy"
              className="w-full h-full object-cover"
            />

            {i === 0 && (
              <span className="absolute top-1 left-1 resaltado dato px-1.5 py-1 rounded-[3px]">
                Principal
              </span>
            )}

            <button
              type="button"
              onClick={() => void quitar(foto)}
              aria-label={`Borrar foto ${i + 1}`}
              className="absolute top-1 right-1 w-7 h-7 grid place-items-center rounded-full bg-papel border border-tinta text-tinta"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {i !== 0 && (
              <button
                type="button"
                onClick={() => void hacerPrincipal(foto)}
                className="absolute bottom-0 inset-x-0 py-1.5 bg-papel/90 dato text-tinta"
              >
                Hacer principal
              </button>
            )}
          </li>
        ))}

        {lugaresLibres > 0 && (
          <li className="aspect-[3/4]">
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={subiendo}
              className="w-full h-full grid place-items-center gap-1 rounded-chip border-2 border-dashed border-lapiz text-grafito disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path
                  d="M12 5v14M5 12h14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
              <span className="dato">{subiendo ? 'Subiendo' : 'Agregar'}</span>
            </button>
          </li>
        )}
      </ul>

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => void alElegir(e)}
        className="sr-only"
        // capture no va: en el celular queremos que pueda elegir del rollo o
        // sacar una en el momento, y eso lo decide el sistema.
      />

      {error && <Aviso>{error}</Aviso>}
    </div>
  )
}
