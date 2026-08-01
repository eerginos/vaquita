# Split

Un Splitwise propio: gastos compartidos entre amigos, gratis y autoalojado.
Registro cerrado por invitación, sin apps de terceros, sin límites de free tier.

> Este archivo es cómo levantarlo y desplegarlo.
> [`CONTEXT.md`](CONTEXT.md) explica por qué las cosas son como son y qué se decidió no hacer.
> [`CLAUDE.md`](CLAUDE.md) es la guía para trabajar en el código.

## Qué hace

- **Grupos** con moneda propia, ícono y archivado.
- **Gastos** con cuatro formas de dividir: partes iguales, montos exactos,
  porcentajes y partes (ej. 2 partes para una pareja, 1 para cada soltero).
- **Varios pagadores** en un mismo gasto.
- **Balances** por grupo y consolidados por persona.
- **Simplificación de deudas** opcional por grupo: en vez de A→B y B→C,
  sugiere A→C directo.
- **Pagos** (settlements) para saldar cuentas, con sugerencias precargadas.
- **Comentarios** en cada gasto y **feed de actividad** por grupo.
- **Invitaciones** por link de un solo uso, con o sin grupo asociado.
- Modo claro y oscuro automático, responsive.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) |
| Lenguaje | TypeScript |
| Base | PostgreSQL 17 + Prisma 7 (driver adapter `pg`) |
| Estilos | Tailwind CSS 4 |
| Auth | Sesiones propias en cookie httpOnly + bcrypt |
| Deploy | Docker (multi-stage) → Coolify |

### Cómo se maneja la plata

Todos los importes se guardan como **enteros en centavos** (`BigInt`), nunca
como float. El reparto usa el método del resto mayor, así la suma de las partes
da siempre exactamente el total del gasto — no se pierde ni se inventa un centavo.

## Desarrollo local

```bash
npm install
cp .env.example .env          # editá los valores
docker compose up -d          # Postgres en el puerto 5433
npx prisma migrate deploy     # crea las tablas
npm run db:seed               # datos de ejemplo (opcional)
npm run dev
```

Abrí http://localhost:3000.

Si corriste el seed, entrás con el email de `BOOTSTRAP_ADMIN_EMAIL` y la
contraseña `split1234`. **Ojo: el seed borra toda la base.**

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | `prisma generate` + build de producción. Es el chequeo de tipos: no hay tests ni linter. |
| `npm run db:migrate` | Crea una migración nueva a partir del schema |
| `npm run db:deploy` | Aplica migraciones pendientes (producción) |
| `npm run db:studio` | Prisma Studio para mirar la base |
| `npm run db:seed` | Carga datos de ejemplo (destructivo) |

## Deploy en Coolify

1. **Base de datos**: en tu proyecto de Coolify, `+ New` → `Database` →
   `PostgreSQL 17`. Anotá la connection string interna.

2. **Aplicación**: `+ New` → `Public/Private Repository` →
   `github.com/eerginos/erginos-split`.
   - Build Pack: **Dockerfile**
   - Port: **3000**
   - Health check path: `/api/salud`

3. **Variables de entorno**:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | La connection string interna del Postgres de Coolify |
   | `AUTH_SECRET` | `openssl rand -hex 32` |
   | `APP_URL` | `https://split.erginos.com.ar` |
   | `BOOTSTRAP_ADMIN_EMAIL` | Tu email |

   La zona horaria ya viene fijada en el Dockerfile
   (`TZ=America/Argentina/Buenos_Aires`). Las fechas se formatean en el
   servidor, así que sin eso el contenedor correría en UTC y un gasto cargado
   después de las 21:00 quedaría con la fecha del día siguiente. Si algún día
   lo usás desde otro país, cambiá esa línea del Dockerfile.

4. **Dominio**: poné `https://split.erginos.com.ar`. Coolify saca el
   certificado con Let's Encrypt solo.

5. Deploy. El contenedor corre `prisma migrate deploy` al arrancar, así que
   las tablas se crean solas.

6. Entrá a `/registro` con el email de `BOOTSTRAP_ADMIN_EMAIL`: como la base
   está vacía, esa primera cuenta se crea sin invitación y queda como admin.
   A partir de ahí el registro queda cerrado.

## Cómo sumar gente

No hay envío de mails (a propósito: una dependencia menos). Todo va por link:

- **Alguien nuevo** → `/admin` → *Invitar a alguien nuevo* → generás el link y
  se lo pasás por WhatsApp. Vence a los 14 días, se usa una sola vez.
- **Alguien nuevo directo a un grupo** → configuración del grupo →
  *Invitar gente nueva*. Al crear la cuenta ya entra al grupo.
- **Alguien que ya tiene cuenta** → configuración del grupo →
  *Sumar gente que ya tiene cuenta*.
- **Se olvidó la contraseña** → `/admin` → *Restablecer una contraseña* →
  generás un link que vence en 24 horas y se lo pasás.

## Notas de seguridad

- Las contraseñas se guardan con bcrypt (12 rondas).
- El token de sesión viaja en una cookie `httpOnly` + `SameSite=Lax`;
  en la base sólo se guarda su HMAC-SHA256 con `AUTH_SECRET`, nunca el token.
- Cambiar la contraseña cierra todas las demás sesiones.
- `AUTH_SECRET` es obligatorio y tiene que tener al menos 16 caracteres:
  si cambia, todas las sesiones y los links de reset dejan de valer.
- Todas las Server Actions revalidan la membresía al grupo antes de tocar nada.

## Qué quedó afuera (por ahora)

Multi-moneda con conversión, recibos adjuntos, gastos recurrentes y
notificaciones por email. La estructura ya está preparada: los gastos guardan
`currency` propio y los balances se agrupan por moneda.
