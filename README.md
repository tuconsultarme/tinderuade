# UADencuentros

App para conocer gente de UADE. Perfil con fotos, mazo de candidatos que se
resuelve arrastrando, match recíproco y chat en tiempo real.

**Es una app de celular.** Está diseñada a 390×844 y el shell se topea en 480px
de ancho, así que en la compu se ve como un teléfono centrado. Para probarla,
abrí las herramientas del navegador y poné vista de dispositivo móvil.

---

## Probarla ya, sin base ni cuentas

```bash
npm install
npm run dev:demo
```

Queda en http://localhost:5180 y entra derecho al mazo. No hace falta `.env`,
ni Supabase, ni registrarse.

En modo demo hay ocho perfiles de prueba, el mazo funciona con las tres lentes,
**cada tercer "me gusta" arma un match** para poder ver esa pantalla, y el chat
anda con mensajes en memoria.

Dos cosas que en demo no son reales:

- **El estado vive en memoria.** Si recargás la página, los matches y los
  mensajes nuevos se reinician. La conversación de ejemplo con Tomás siempre
  vuelve a estar.
- **No se suben fotos ni se guarda el perfil.** Eso necesita la base conectada.
  Las fotos de los perfiles de prueba son bloques SVG generados, no fotos.

Para sacar el demo del proyecto: borrar `src/lib/demo.ts` y las ramas
`if (MODO_DEMO)` que quedan en `useMazo`, `useMatches`, `useCatalogos`,
`useMisFotos`, `SesionContext`, `Chat`, `PerfilDetalle` y `MiPerfil`.

## Correrla de verdad

```bash
cp .env.local.example .env.local   # completar VITE_SUPABASE_ANON_KEY
npm run dev
```

Para abrirla desde el celular en la misma red: `npm run dev -- --host`

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo, contra Supabase |
| `npm run dev:demo` | Servidor de desarrollo, con datos falsos y sin login |
| `npm run build` | Typecheck + build de producción |
| `npm run lint` | Linter |
| `npm run preview` | Sirve el build de producción |

### Antes de la primera corrida contra Supabase

La base tiene que estar al día. Si el proyecto de Supabase se creó antes que el
front, falta la migración `0005`: pegá `supabase/migrations/0005_reordenar_fotos.sql`
en el SQL Editor. Sin ella no anda reordenar ni borrar fotos del perfil.

Los detalles de la base están en [`supabase/README.md`](supabase/README.md).

### Llenar el mazo con perfiles de prueba

Con la base vacía, te registrás y el mazo aparece sin nadie: se llena con otros
perfiles que hayan terminado el onboarding. Para no tener que crear cuentas a
mano hay un script.

```bash
# 1. Poné la service_role key en .env.local
#    (Supabase → Project Settings → API → "service_role")

# 2. Registrate en la app y completá el onboarding

# 3. Sembrá seis perfiles que además te dejen like puesto
npm run seed -- tu@mail.com
```

Los seis perfiles quedan con foto, carrera, sede e intenciones. Como ya te
dieron like, apenas vos les des like a ellos el match salta en el momento y
podés ver esa pantalla sin necesitar una segunda persona.

Sin el mail como argumento (`npm run seed`) crea los perfiles pero sin los
likes. Para borrarlos: `npm run seed -- --borrar`.

> **La `service_role` key saltea la RLS entera.** Va solo en `.env.local`, que
> está en `.gitignore`. Nunca con prefijo `VITE_`, nunca en el navegador. El
> script corre en tu máquina, no en la app.

Las cuentas de prueba usan mails `@uadencuentros.test` y todas entran con la
contraseña `uadencuentros-demo-2026`, por si querés loguearte como una de ellas
para ver los dos lados de un chat.

---

## La idea

Tres lentes sobre el mismo campus: **citas**, **amistad** y **estudio**. No es
un mazo de gente, es el mismo campus mirado de tres maneras. La misma persona te
puede interesar para estudiar y no para salir, y son dos decisiones distintas
(la base guarda un swipe por intención).

El **conmutador** —el selector de tres posiciones arriba del mazo— es el
elemento firma. Moverlo cambia el acento de toda la interfaz, recompone la card
con GSAP Flip y recarga el mazo. Si la persona que estabas viendo también existe
en la lente nueva, se queda arriba: eso es lo que hace que se lea como "la misma
persona, mirada de otra manera".

| Lente | Acento | Qué destaca la card |
|---|---|---|
| Citas | mandarina `#FFA24D` | Foto casi a pantalla completa, nombre y edad |
| Amistad | lima `#D8F94F` | Foto media, carrera, sede |
| Estudio | agua `#66E8DC` | Foto chica, **materias en común** en grande |

### El gesto

Sin verde ni rojo. Arrastrando a la derecha la card se llena del fluo del modo
activo (**te resalto**); a la izquierda la cruza un trazo de tinta (**te
tacho**). Resaltar y tachar sobre papel: la misma metáfora que el sistema de
color.

---

## Estructura

```
src/
  lib/          supabase, tipos del schema, subida de fotos, config
  context/      sesión (auth + perfil) y modo (lente activa)
  hooks/        arrastre, mazo, matches, fotos, catálogos
  components/   Conmutador (firma), card, shell, primitivas de UI
  paginas/      Entrada, Onboarding, Mazo, Matches, Chat, MiPerfil, PerfilDetalle
supabase/       migraciones, seed y tests de la base
```

---

## Dónde tocar el diseño

Todo el sistema visual está en **`src/index.css`**, arriba de todo, en el bloque
`@theme`. No hay colores ni fuentes sueltos en los componentes.

**Colores.** Cambiá los tokens `--color-*`. La app entera los sigue.

```css
--color-papel:     #F8F8F4;  /* fondo */
--color-tinta:     #161A20;  /* texto */
--color-grafito:   #5E6672;  /* texto secundario */
--color-lapiz:     #E3E4DC;  /* líneas */
--color-mandarina: #FFA24D;  /* citas */
--color-lima:      #D8F94F;  /* amistad */
--color-agua:      #66E8DC;  /* estudio */
```

**Tipografías.** Cambiá `--font-display`, `--font-body` y `--font-mono` en
`@theme`, y actualizá el `<link>` de Google Fonts en `index.html`.

Hoy: **Archivo** (display, eje Expanded), **Instrument Sans** (texto),
**DM Mono** (datos: edad, año, materias en común, hora del mensaje).

### Dos reglas del sistema

1. **Los fluo son siempre relleno debajo de tinta, nunca texto sobre papel.**
   Es lo que hace que parezca resaltador de verdad, y de paso deja el contraste
   entre 9:1 y 14:1 — AA de sobra. Si en algún momento ponés `text-lima` sobre
   el fondo claro, se rompe.
2. **Cero `box-shadow` en todo el proyecto.** La profundidad sale del color y
   del movimiento.

### Movimiento

Con `prefers-reduced-motion: reduce` el swipe **sigue funcionando** —es un
gesto, no un adorno— pero se apagan la rotación, el rebote y la coreografía del
match. Se anima solo `transform` y `opacity`.

---

## Fotos

Bucket **privado**, servido con signed URLs de una hora. Hasta 6 por perfil; la
de orden 0 es la que se ve en el mazo.

Las subidas van por `fetch` directo al endpoint REST de Storage, no por
`supabase.storage.from().upload()`, porque el SDK ya dio errores en runtime en
otro proyecto. Van con el access token del propio usuario: la política de
`0004_storage.sql` exige que la primera carpeta del path sea `auth.uid()`, así
que el JWT autoriza exactamente la carpeta de esa persona. **La `service_role`
key nunca va al navegador**: saltea la RLS entera.

Antes de subir, las imágenes se reescalan a 1440px y se pasan a WebP en el
cliente. Una foto de celular pesa entre 3 y 8 MB y el bucket corta en 5.

---

## Estado

Funciona el circuito completo: registro, onboarding en cuatro pasos, carga de
fotos, mazo con las tres lentes, match y chat en tiempo real.

**Falta decidir:** el registro hoy acepta **cualquier mail**, que fue lo que se
decidió en el kickoff. Para exigir `@uade.edu.ar` alcanza con cambiar una línea
en `src/lib/config.ts`:

```ts
export const DOMINIO_MAIL_REQUERIDO: string | null = 'uade.edu.ar'
```

**Pendiente:** el seed de carreras y sedes se escribió de memoria y no está
verificado contra la web de UADE.
