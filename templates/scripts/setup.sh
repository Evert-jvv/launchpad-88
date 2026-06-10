#!/usr/bin/env sh
set -eu

detect_pm() {
  if [ -f pnpm-lock.yaml ]; then echo pnpm; return; fi
  if [ -f package-lock.json ]; then echo npm; return; fi
  if [ -f yarn.lock ]; then echo yarn; return; fi
  if [ -f bun.lockb ] || [ -f bun.lock ]; then echo bun; return; fi
  echo npm
}

if [ ! -f package.json ]; then
  echo "No package.json found"
  exit 0
fi

PM="$(detect_pm)"
echo "Installing dependencies with $PM"

case "$PM" in
  pnpm) pnpm install ;;
  npm) npm install ;;
  yarn) yarn install ;;
  bun) bun install ;;
  *) echo "Unsupported package manager: $PM"; exit 1 ;;
esac
