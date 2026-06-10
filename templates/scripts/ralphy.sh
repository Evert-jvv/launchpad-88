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

# Replace this with the exact ralphy command installed locally.
# ralphy --task "$TASK_FILE" --max-iterations "$MAX_ITERATIONS"

./scripts/lint.sh || true
./scripts/typecheck.sh || true
./scripts/test.sh || true
./scripts/build.sh || true
