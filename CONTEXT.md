# Contexto del proyecto

Por qué las cosas son como son. `README.md` explica cómo levantarlo, `CLAUDE.md` cómo trabajar
adentro; esto es el registro de decisiones, para no volver a discutir lo ya discutido ni repetir
un camino que se descartó por algo.

## El problema

Splitwise resuelve bien dividir gastos, pero es un servicio de terceros con límites y publicidad,
y la data de quién le debe cuánto a quién queda en un servidor ajeno. Esto es lo mismo, gratis,
corriendo en un VPS propio, para un grupo cerrado de amigos.

Del uso real de Splitwise salieron dos dolores concretos que acá están resueltos:

1. **Sumar a alguien tarde.** Armás el grupo, cargás gastos, y recién después se suman los que
   faltaban: los gastos viejos no los incluyen y hay que editarlos de a uno. Acá hay una pantalla
   de recálculo masivo (`/grupos/[id]/incluir`) con vista previa de cómo quedan los saldos.
2. **Cargar un gasto con montos distintos.** Escribir cuatro números cuando alcanzaba con uno. En
   montos exactos y porcentajes, lo que falta se reparte solo entre los que todavía no tocaste.

## Decisiones y por qué

**Todo en enteros de centavos, nunca floats.** Es plata entre amigos: un centavo que aparece o
desaparece genera desconfianza en el número completo. El reparto usa resto mayor, así la suma de
las partes siempre cierra exacto con el total.

**Sesiones propias en vez de una librería de auth.** Son cinco personas y un registro cerrado.
NextAuth o similar traía más configuración y conceptos que los que el problema necesita. Cookie
httpOnly, HMAC del token en la base, bcrypt para las contraseñas.

**Sin envío de mails.** Es la dependencia externa que más se rompe (SMTP, dominios, spam) y la
menos necesaria acá: las invitaciones y los links de reset se pasan por WhatsApp, que es donde
esta gente ya se habla. Menos partes móviles, cero costo, cero configuración.

**Los links de invitación pueden ser de un solo uso o para varios.** El caso "lo mando al grupo de
WhatsApp" es real y necesitaba usos ilimitados. Como contrapeso, ese link vence a los 7 días en vez
de 14: un link que crea cuentas puede reenviarse fuera del grupo, y cuanto menos tiempo esté vivo,
mejor. Siempre se puede revocar.

**El alias de pago vive en el perfil y sólo lo ve quien tiene que pagar.** En Argentina la fricción
real para saldar no es calcular cuánto, es conseguir el alias. Splittr hace lo mismo con links de
PayPal.

**Deudas simplificadas es opcional por grupo.** Simplificar reduce la cantidad de transferencias
pero rompe la trazabilidad de quién gastó con quién. Hay grupos donde eso importa (convivientes) y
grupos donde no (un viaje). Que lo decida cada grupo.

**Emoji en vez de iniciales para el avatar.** Se lee más rápido que dos letras y hace que la app se
sienta de ellos y no de una herramienta. El color quedó como tinte de fondo, asignado
automáticamente: dos cosas compitiendo por identificar a la misma persona era una de más.

**Los datos sueltos de estadísticas son neutrales a propósito.** Splittr muestra "el más generoso"
y "el que más debe". Un ranking público de quién debe más puede picar entre amigos, así que acá van
datos sin juicio: el gasto más caro, quién cargó más, quién adelantó más plata.

## Lo que se decidió NO hacer

No están descartadas para siempre; se dejaron afuera con una razón.

| | Por qué |
|---|---|
| **Multi-moneda con conversión** | Un grupo maneja una sola moneda. Convertir obliga a decidir a qué cotización y de qué fecha, y a explicarlo en la interfaz. Los gastos ya guardan su `currency` y los balances se agrupan por moneda, así que la estructura está lista. |
| **Fotos** (portada de grupo, ticket del gasto) | Abre almacenamiento de archivos en el VPS: volumen, backups, permisos. Es una decisión de infraestructura, no un feature suelto. |
| **Gastos recurrentes** | Necesita un scheduler y decidir qué pasa si alguien se va del grupo a mitad de camino. |
| **Ingresos** (plata que entra y se reparte) | Devolución de un depósito, sobró de la vaquita. Toca el modelo, los balances y los formularios. Se puede aproximar registrando pagos. |
| **Notificaciones por email** | Ver "sin envío de mails". |
| **Categorías propias** | Las 13 fijas cubren casi todo; un ABM de categorías es complejidad por poco. |
| **Badges de no leído** | Requiere trackear última lectura por persona y por grupo. Plomería para poca cosa. |
| **Tests automatizados** | Con un solo desarrollador y verificación manual en el navegador, el costo superaba al beneficio. **Si esto cambia, `lib/money.ts`, `lib/balances.ts` y `lib/split.ts` son lo primero que hay que cubrir**: son funciones puras, sin dependencias, y son donde un error se traduce en plata mal calculada. |

## Deuda conocida

- **`npm audit` marca 3 vulnerabilidades *high*** en `postcss` y `sharp`, ambas dentro del propio
  paquete `next`. `npm audit fix --force` las "arregla" bajando Next a una versión vieja, que es
  peor. Son de build-time y de optimización de imágenes remotas, que no se usa. Se resuelven solas
  cuando Next publique el bump.
- **No hay linter.** `next lint` se removió en Next 16 y no se reemplazó por ESLint standalone.
- **La lista de personas registradas la ve cualquier usuario** al crear un grupo o sumar gente
  (nombre y email). Es necesario para poder invitar, pero es data que se comparte entre todos los
  que usan la app.
- **Sin backups automáticos de la base.** Hoy depende de lo que haga Coolify por su lado.

## Historia

Se construyó en una sola sesión, en este orden: núcleo (grupos, gastos, saldos, pagos) → deploy en
Coolify → responsive y zona horaria → recálculo retroactivo → autocompletado del reparto → avatares
con emoji → ideas tomadas de Splittr (alias, saldar de un click, estadísticas) → marca propia →
invitaciones para varios con vista previa en WhatsApp.

El repo es privado: `github.com/eerginos/vaquita`.
