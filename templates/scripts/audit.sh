#!/usr/bin/env sh
set -u

mkdir -p .audit
SUMMARY=".audit/summary.txt"
LARGE_FILES=".audit/large-files.txt"
: > "$SUMMARY"

log() {
  echo "$1" | tee -a "$SUMMARY"
}

run_check() {
  NAME="$1"
  COMMAND="$2"
  log ""
  log "== $NAME =="
  sh -c "$COMMAND" >> "$SUMMARY" 2>&1
  STATUS=$?
  if [ "$STATUS" -eq 0 ]; then
    log "$NAME: ok"
  else
    log "$NAME: failed ($STATUS)"
  fi
}

log "lp88 audit"
log "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

for FILE in README.md AGENTS.md .codex/config.toml; do
  if [ -f "$FILE" ]; then
    log "OK: $FILE"
  else
    log "MISSING: $FILE"
  fi
done

run_check "lint" "./scripts/lint.sh"
run_check "typecheck" "./scripts/typecheck.sh"
run_check "test" "./scripts/test.sh"
run_check "build" "./scripts/build.sh"

if [ -f package.json ]; then
  if [ -f pnpm-lock.yaml ] && command -v pnpm >/dev/null 2>&1; then
    run_check "package audit" "pnpm audit"
  elif [ -f yarn.lock ] && command -v yarn >/dev/null 2>&1; then
    run_check "package audit" "yarn npm audit"
  elif [ -f bun.lockb ] || [ -f bun.lock ]; then
    if command -v bun >/dev/null 2>&1; then
      run_check "package audit" "bun audit"
    else
      log "package audit: bun not found"
    fi
  elif command -v npm >/dev/null 2>&1; then
    run_check "package audit" "npm audit --audit-level=moderate"
  else
    log "package audit: no supported package manager found"
  fi
else
  log "package audit: No package.json found"
fi

find . \
  -path "./.git" -prune -o \
  -path "./node_modules" -prune -o \
  -path "./.next" -prune -o \
  -path "./dist" -prune -o \
  -path "./build" -prune -o \
  -type f -size +200k -print | sort > "$LARGE_FILES"

log ""
log "Large files saved to $LARGE_FILES"
log "Audit summary saved to $SUMMARY"
echo "Audit results saved to .audit/"
