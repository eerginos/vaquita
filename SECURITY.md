# Seguridad

## Cómo reportar un problema

Si encontrás una vulnerabilidad, **no abras un issue público**. Usá el reporte
privado de GitHub: pestaña **Security** del repo → *Report a vulnerability*.
Eso llega sólo a quien mantiene el proyecto.

Contame qué encontraste, cómo reproducirlo y qué se puede hacer con eso. Un
ejemplo mínimo ayuda más que una descripción larga.

Esto lo mantiene una sola persona a ratos: no hay guardia ni tiempos
garantizados. Contesto apenas lo veo, y si el problema es real lo arreglo antes
de publicar nada al respecto.

## Qué entra

Lo que vive en este repo: la app, el `Dockerfile`, los compose y el modelo de
datos. Por ejemplo: robo o falsificación de sesión, saltarse la validación de
membresía, ver datos de un grupo del que no formás parte, inyección, o llegar a
administrador sin serlo.

Lo que **no** entra es tu instancia. Un `AUTH_SECRET` débil, la base expuesta a
internet o la app sin HTTPS adelante son cosas que se arreglan en tu servidor.

Se arregla sobre la última versión publicada. No hay backports a tags viejos.

## Si lo autoalojás

- `AUTH_SECRET` largo y único, generado con `openssl rand -hex 32`. Si se
  filtra, cambialo: se cierran todas las sesiones y se invalidan los links de
  restablecer contraseña.
- No expongas Postgres a internet. Que le hable sólo la app, por la red interna.
- Poné un reverse proxy con HTTPS adelante. En producción la cookie de sesión
  viaja con `Secure`, así que sin TLS no vas a poder ni entrar.
- Para actualizar: `git pull` y redeploy. Las migraciones corren solas al
  arrancar el contenedor.
