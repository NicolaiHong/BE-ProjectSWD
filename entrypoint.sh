#!/bin/sh
set -e

echo "==> Starting AI Idea API..."

# Wait for database to be ready (max 30 seconds)
if [ -n "$DB_HOST" ]; then
  echo "==> Waiting for PostgreSQL at $DB_HOST:${DB_PORT:-5432}..."
  RETRIES=30
  until pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" > /dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
    echo "    Waiting for database... ($((RETRIES)) retries left)"
    RETRIES=$((RETRIES - 1))
    sleep 1
  done

  if [ $RETRIES -eq 0 ]; then
    echo "==> ERROR: Could not connect to database!"
    exit 1
  fi

  echo "==> Database is ready!"
fi

# Execute the main command (CMD)
echo "==> Executing: $@"
exec "$@"
