# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Split: un clon de Splitwise autoalojado, privado, para un grupo de amigos en Argentina.
Web solamente (responsive, sin app nativa). Registro cerrado por invitación.
La UI, las rutas y los comentarios del código están **en español rioplatense** — mantené ese registro.

## Comandos

```bash
docker compose up -d          # Postgres local en el puerto 5433 (el 5432 suele estar ocupado)
npm run dev                   # servidor de desarrollo
npm run build                 # prisma generate + next build. Es el chequeo de tipos del proyecto.
npm run db:migrate            # crear y aplicar una migración a partir del schema
npm run db:deploy             # aplicar migraciones pendientes (lo que corre el contenedor al arrancar)
npm run db:studio             # explorar la base
npm run db:seed               # datos de ejemplo — BORRA TODA LA BASE antes de cargar
```

No hay tests ni linter configurados. **`npm run build` es la única verificación automática**:
corre TypeScript sobre todo el proyecto y falla ante cualquier error de tipos. Corrélo antes de
dar por terminado un cambio.

Para verificar comportamiento, levantá la app y probá el flujo real. El seed deja tres grupos con
gastos, pagos y comentarios; se entra con el email de `BOOTSTRAP_ADMIN_EMAIL` y la contraseña
`split1234`.

## Reglas del dominio

**La plata son enteros en centavos (`bigint`), nunca floats.** Las columnas de importe son `BigInt`
en Prisma. Todo reparto pasa por `lib/money.ts` (`splitEvenly`, `allocateByWeights`), que usan el
método del resto mayor para que **la suma de las partes cierre exacto con el total** — el centavo
sobrante va determinísticamente a los primeros. Si tocás reparto, la invariante a preservar es esa.

**Saldo ≠ consumo.** El saldo (`net`) es lo que te deben menos lo que debés; el consumo es la suma
de tus partes. Se pueden haber gastado millones y estar en cero.

**Los `bigint` no cruzan a componentes de cliente.** Serializalos como `string` y reconstruilos del
otro lado (ver `app/(app)/grupos/[groupId]/incluir/`).

## Arquitectura

Next.js App Router con Server Components y Server Actions. No hay API REST ni capa de cliente de
datos: las páginas leen con Prisma y los formularios postean a Server Actions.

**El cálculo de saldos** es el corazón y vive en `lib/balances.ts`, todo en funciones puras:

1. `netBalances()` — saldo neto de cada uno a partir de gastos y pagos.
2. `pairwiseDebts()` — deudas reales par a par: la parte de cada participante se reparte entre
   quienes pagaron, en proporción a lo que puso cada uno.
3. `simplifyDebts()` — greedy de mínimo flujo sobre los saldos netos.
4. `settlementPlan()` — elige entre 2 y 3 según el flag `simplifyDebts` del grupo.

`lib/queries.ts` es la capa de lectura: `loadLedgers()` trae los movimientos crudos y el resto
compone sobre eso. Cualquier pantalla que muestre saldos debe pasar por `settlementPlan()`, no
recalcular por su cuenta.

**Autorización.** No hay middleware. Cada página de grupo verifica membresía y hace `notFound()`
si no sos miembro (404, no "sin permiso": no confirma que el grupo exista). **Cada Server Action
revalida la membresía en el servidor antes de escribir** — el chequeo de la página no alcanza,
porque las acciones son endpoints HTTP invocables a mano. Ser admin no da acceso al contenido de
grupos ajenos, sólo a `/admin`.

**Sesiones** (`lib/auth.ts`): token aleatorio en cookie httpOnly; en la base se guarda su
HMAC-SHA256 con `AUTH_SECRET`, nunca el token. Cambiar `AUTH_SECRET` invalida todas las sesiones y
todos los links de reset.

**Invitaciones** (`lib/invites.ts`, `app/invitacion/`): un link puede ser de un solo uso o
ilimitado (`maxUses: null`, para mandar a un grupo de WhatsApp). El consumo de usos va con
compare-and-swap sobre `useCount` para que dos personas simultáneas no se pasen del límite.
`/invitacion/[code]` es una página (necesita metadata para la vista previa de WhatsApp) que
redirige a `/invitacion/entrar`, un route handler que hace la escritura.

## Trampas conocidas

Cosas que ya costaron tiempo y conviene no volver a descubrir:

- **Tailwind v4 no permite `@apply` de clases propias.** En `globals.css` las variantes de botón
  repiten la base en un selector agrupado en vez de aplicar `.btn`.
- **TypeScript está fijado en 6.** La 7 no expone la API de compilador que necesita Next 16 y el
  dev server muere al arrancar.
- **Prisma 7**: el cliente se genera en `lib/generated/prisma/` (gitignoreado) y se instancia con
  el adapter `PrismaPg`. Después de tocar el schema hay que **reiniciar el dev server**, no alcanza
  con `prisma generate`: el proceso tiene el cliente viejo en memoria.
- **Nada de `window.confirm`.** Los navegadores embebidos lo descartan solo y eso cuenta como
  cancelar, así que el botón queda mudo. Usá la prop `confirm` de `SubmitButton`, que arma la
  pregunta en línea.
- **En route handlers, devolvé `Location` relativo.** Detrás del proxy de Coolify la URL del
  request es la interna del contenedor (`0.0.0.0:3000`); armar una URL absoluta con ella manda al
  navegador a una dirección inexistente.
- **La imagen de vista previa no renderiza emojis** (el generador de Next no trae fuente de emoji):
  se dibujan como cuadraditos. Usá formas y texto.
- **`TZ=America/Argentina/Buenos_Aires` está fijado en el Dockerfile.** Las fechas se formatean en
  el servidor; sin eso el contenedor corre en UTC y un gasto cargado después de las 21:00 aparece
  con la fecha del día siguiente. Las fechas por defecto de los formularios se calculan en el
  servidor y se pasan por prop, para que no difieran entre SSR e hidratación.
- **El seed es destructivo.** Nunca contra producción.

## Convenciones

- Rutas y textos en español (`/grupos`, `/gastos`, `/saldar`, `/configuracion`).
- Nombre de pila en listas apretadas (`lib/names.ts`, que desambigua con la inicial del apellido si
  se repite); nombre completo en perfil, integrantes, admin y detalle de gasto.
- Componentes de servidor por defecto; `"use client"` sólo donde hay estado o interacción.
- Los formularios con estado usan `useActionState` y devuelven `{ error?, success? }`.
- Mensajes de error escritos para una persona, no para un desarrollador: "Faltan asignar $1.200
  para llegar al total", no "validation failed".

## Deploy

Coolify construye el `Dockerfile` (build pack Dockerfile, puerto 3000). El entrypoint corre
`prisma migrate deploy` antes de levantar el server, así que las migraciones se aplican solas en
cada deploy. Healthcheck en `/api/salud`. Variables requeridas: `DATABASE_URL`, `AUTH_SECRET`,
`APP_URL`, `BOOTSTRAP_ADMIN_EMAIL`. **El push a `main` dispara deploy automático.**
