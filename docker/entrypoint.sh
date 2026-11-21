#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Seeding agents and connector directory (idempotent)..."
npx prisma db seed

exec "$@"
