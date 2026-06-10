#!/usr/bin/env sh
set -eu

TASK_FILE="${1:-docs/prd/current.md}"
MAX_ITERATIONS="${MAX_ITERATIONS:-3}"

if [ ! -f "$TASK_FILE" ]; then
  echo "Missing task file: $TASK_FILE"
  exit 1
fi

echo "Running bounded Ralphy loop"
echo "Task: $TASK_FILE"
echo "Max iterations: $MAX_ITERATIONS"

if ! command -v ralphy >/dev/null 2>&1; then
  echo "Ralphy CLI was not found."
  echo "Install it with: npm install -g ralphy-cli"
  echo "Source: https://github.com/michaelshimeles/ralphy"
  exit 1
fi

ralphy --prd "$TASK_FILE" --max-iterations "$MAX_ITERATIONS"

./scripts/lint.sh || true
./scripts/typecheck.sh || true
./scripts/test.sh || true
./scripts/build.sh || true
