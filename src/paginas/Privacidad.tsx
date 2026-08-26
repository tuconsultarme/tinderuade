import { useNavigate } from 'react-router-dom'
import { ShellPlano } from '@/components/shell/AppShell'

/**
 * Política de privacidad. Ruta pública (/privacidad), sin sesión ni tabs:
 * hay que poder leerla antes de registrarse.
 *
 * El contenido describe lo que la app realmente hace (ver supabase/), no lo
 * que se aspira a hacer. Si el modelo de datos cambia, esto tiene que
 * cambiar con él.
 */
export function Privacidad() {
  const navegar = useNavigate()

  return (
    <ShellPlano>
      <header className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-lapiz">
        <button
          type="button"
          onClick={() => navegar(-1)}
          aria-label="Volver"
          className="w-10 h-10 grid place-items-center -ml-1"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M15 5l-7 7 7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="text-xl">Privacidad</h1>
      </header>

      <div className="px-5 py-6 flex flex-col gap-6 text-tinta/90 leading-relaxed">
        <div>
          <p className="dato text-grafito">Última actualización: 24 de agosto de 2026</p>
          <p className="mt-3">
            Esta política explica qué datos pide UADencuentros, para qué los usa y qué podés hacer
            vos con ellos. Está escrita en criollo a propósito: si algo no se entiende, es un
            problema del texto, no tuyo — escribinos.
          </p>
        </div>

        <Seccion titulo="Quién trata tus datos">
          <p>
            UADencuentros es un proyecto independiente, hecho por estudiantes.{' '}
            <strong>No es una app oficial de UADE</strong> ni tiene relación con la universidad más
            allá de que sus usuarios cursan ahí.
          </p>
          <p className="mt-2">
            Responsable: Salvador Soncini. Contacto para cualquier consulta sobre tus datos:{' '}
            <a href="mailto:salvadorsoncini@gmail.com" className="underline underline-offset-4">
              salvadorsoncini@gmail.com
            </a>
            .
          </p>
        </Seccion>

        <Seccion titulo="Qué datos pedimos">
          <p>Para usar la app hace falta:</p>
          <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
            <li>Mail y contraseña, para tu cuenta.</li>
            <li>Nombre, fecha de nacimiento y género.</li>
            <li>Al menos una foto (hasta 6).</li>
            <li>Con qué intención usás la app: match o estudio.</li>
          </ul>
          <p className="mt-2">Opcional, si lo cargás vos:</p>
          <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
            <li>Carrera, sede y año de ingreso.</li>
            <li>Bio.</li>
            <li>Qué materias cursás (solo para la intención de estudio).</li>
            <li>Usuario de Instagram.</li>
            <li>A quién le diste "me gusta" o pasaste, con quién hiciste match y los mensajes del chat.</li>
          </ul>
        </Seccion>

        <Seccion titulo="Para qué los usamos">
          <p>Únicamente para que la app funcione:</p>
          <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
            <li>Armar tu mazo con gente compatible según intención, edad y preferencia de género.</li>
            <li>Avisarte cuando hay match y habilitar el chat con esa persona.</li>
            <li>Para estudio, mostrar cuántas materias tenés en común con cada candidato.</li>
          </ul>
          <p className="mt-2">
            No usamos tus datos para publicidad, no los vendemos y no los compartimos con nadie
            fuera de lo que se explica abajo.
          </p>
        </Seccion>

        <Seccion titulo="Quién ve qué">
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>
              Tu <strong>nombre, edad, fotos, carrera, sede y bio</strong> los ve cualquier persona
              con cuenta a la que le puedas aparecer en el mazo — es decir, gente de tu facu con
              onboarding completo, salvo que se hayan bloqueado entre ustedes.
            </li>
            <li>
              Tu <strong>Instagram</strong> solo se muestra a la persona con la que hiciste match, y
              recién después del match.
            </li>
            <li>
              Tus <strong>mensajes</strong> del chat solo los ven vos y la otra persona del match.
            </li>
            <li>
              A quién le diste "me gusta" o pasaste <strong>no lo ve nadie</strong> más que vos,
              salvo que sea recíproco (ahí se arma el match y ambos lo saben).
            </li>
            <li>
              Tu <strong>mail y contraseña</strong> no los ve ningún otro usuario de la app.
            </li>
          </ul>
        </Seccion>

        <Seccion titulo="Dónde vive todo esto">
          <p>
            La base de datos y el almacenamiento de fotos corren en{' '}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              Supabase
            </a>
            , un proveedor de infraestructura (no un tercero que use tus datos por su cuenta). Las
            fotos se guardan en un bucket privado: no tienen un link público permanente, cada vez
            que la app te muestra una foto se genera un enlace temporal que vence en una hora.
          </p>
        </Seccion>

        <Seccion titulo="Cuánto tiempo se guardan">
          <p>
            Mientras tu cuenta esté activa. Si la borrás, se borra en cascada todo lo que depende de
            tu perfil: fotos, intenciones, materias, "me gusta" que diste, matches y mensajes. Lo
            único que puede seguir existiendo son los reportes que otra persona haya hecho sobre tu
            cuenta, para que la moderación tenga registro.
          </p>
        </Seccion>

        <Seccion titulo="Tus derechos">
          <p>
            Por la Ley 25.326 de Protección de Datos Personales, tenés derecho a acceder a tus
            datos, pedir que se corrijan si están mal, y pedir que se borren. Desde tu perfil podés
            editar casi todo vos mismo; para lo que no, o para pedir la baja completa de tu cuenta,
            escribinos a{' '}
            <a href="mailto:salvadorsoncini@gmail.com" className="underline underline-offset-4">
              salvadorsoncini@gmail.com
            </a>
            .
          </p>
          <p className="mt-2">
            La Agencia de Acceso a la Información Pública (AAIP), el organismo de control de la
            Ley 25.326, tiene la atribución de atender denuncias y reclamos que se interpongan por
            el incumplimiento de las normas sobre protección de datos personales.
          </p>
        </Seccion>

        <Seccion titulo="Menores de edad">
          <p>
            La app es solo para mayores de 18 años. El registro rechaza a cualquiera que declare
            una fecha de nacimiento que no llegue a esa edad.
          </p>
        </Seccion>

        <Seccion titulo="Seguridad">
          <p>
            Cada usuario solo puede leer y escribir lo que le corresponde: la base tiene reglas de
            acceso a nivel de fila que impiden, por ejemplo, que alguien lea el chat de un match
            ajeno o las fotos de alguien que lo bloqueó, aunque intente pedirlas directo por la API.
            Ningún sistema es infalible, pero es el estándar que seguimos.
          </p>
        </Seccion>

        <Seccion titulo="Cambios a esta política">
          <p>
            Si algo cambia de forma importante — qué datos pedimos o con quién los compartimos — lo
            vamos a reflejar acá, con la fecha de arriba actualizada.
          </p>
        </Seccion>
      </div>
    </ShellPlano>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <div className="mt-1.5">{children}</div>
    </section>
  )
}
