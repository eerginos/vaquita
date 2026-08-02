#!/bin/sh
set -e

echo "→ Aplicando migraciones pendientes…"
node node_modules/prisma/build/index.js migrate deploy

echo "→ Arrancando Vaquita en el puerto ${PORT:-3000}"
exec node server.js
