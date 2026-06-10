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

PM="$(detect_pm)"

if has_script typecheck; then
  case "$PM" in
    pnpm) pnpm run typecheck ;;
    npm) npm run typecheck ;;
    yarn) yarn run typecheck ;;
    bun) bun run typecheck ;;
    *) echo "Unsupported package manager: $PM"; exit 1 ;;
  esac
  exit $?
fi

if [ -f tsconfig.json ]; then
  case "$PM" in
    pnpm) pnpm exec tsc --noEmit ;;
    npm) npx tsc --noEmit ;;
    yarn) yarn tsc --noEmit ;;
    bun) bunx tsc --noEmit ;;
    *) echo "Unsupported package manager: $PM"; exit 1 ;;
  esac
else
  echo "No typecheck configured"
fi
