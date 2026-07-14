#!/usr/bin/env sh
set -e

echo "Generating Prisma client..."
./node_modules/.bin/prisma generate

echo "Running database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "Starting NestJS application..."
exec node dist/src/main
