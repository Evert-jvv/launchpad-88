#!/usr/bin/env sh
set -eu

detect_pm() {
  if [ -f pnpm-lock.yaml ]; then echo pnpm; return; fi
  if [ -f package-lock.json ]; then echo npm; return; fi
  if [ -f yarn.lock ]; then echo yarn; return; fi
  if [ -f bun.lockb ] || [ -f bun.lock ]; then echo bun; return; fi
  echo npm
}

has_script() {
  node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts['$1'] ? 0 : 1)"
}

if [ ! -f package.json ]; then
  echo "No package.json found"
  exit 0
fi

if ! has_script build; then
  echo "No build script found"
  exit 0
fi

PM="$(detect_pm)"
case "$PM" in
  pnpm) pnpm run build ;;
  npm) npm run build ;;
  yarn) yarn run build ;;
  bun) bun run build ;;
  *) echo "Unsupported package manager: $PM"; exit 1 ;;
esac
