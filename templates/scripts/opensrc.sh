#!/usr/bin/env sh
set -eu

TARGET="${1:-}"

if [ -z "$TARGET" ]; then
  echo "Usage: ./scripts/opensrc.sh <package-or-repo>"
  echo "Example: ./scripts/opensrc.sh zod"
  exit 1
fi

if ! command -v opensrc >/dev/null 2>&1; then
  echo "opensrc CLI was not found."
  echo "Install it with: npm install -g opensrc"
  echo "Source: https://github.com/vercel-labs/opensrc"
  exit 1
fi

SOURCE_PATH="$(opensrc path "$TARGET")"
echo "$SOURCE_PATH"
