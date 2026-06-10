#!/usr/bin/env sh
set -eu

TASK_FILE="${1:-docs/prd/current.md}"
MAX_ITERATIONS="${MAX_ITERATIONS:-3}"
CONFIG_FILE=".ralphy/lp88.env"

if [ -f "$CONFIG_FILE" ]; then
  . "$CONFIG_FILE"
fi

RALPHY_ENGINE="${RALPHY_ENGINE:-}"
RALPHY_MODEL="${RALPHY_MODEL:-}"

if [ ! -f "$TASK_FILE" ]; then
  echo "Missing task file: $TASK_FILE"
  exit 1
fi

echo "Running bounded Ralphy loop"
echo "Task: $TASK_FILE"
echo "Max iterations: $MAX_ITERATIONS"
if [ -n "$RALPHY_ENGINE" ]; then
  echo "Engine: $RALPHY_ENGINE"
fi
if [ -n "$RALPHY_MODEL" ]; then
  echo "Model: $RALPHY_MODEL"
fi

if ! command -v ralphy >/dev/null 2>&1; then
  echo "Ralphy CLI was not found."
  echo "Install it with: npm install -g ralphy-cli"
  echo "Source: https://github.com/michaelshimeles/ralphy"
  exit 1
fi

ENGINE_FLAG=""
case "$RALPHY_ENGINE" in
  ""|"default") ENGINE_FLAG="" ;;
  claude) ENGINE_FLAG="--claude" ;;
  codex) ENGINE_FLAG="--codex" ;;
  cursor) ENGINE_FLAG="--cursor" ;;
  opencode) ENGINE_FLAG="--opencode" ;;
  qwen) ENGINE_FLAG="--qwen" ;;
  droid) ENGINE_FLAG="--droid" ;;
  copilot) ENGINE_FLAG="--copilot" ;;
  gemini) ENGINE_FLAG="--gemini" ;;
  *)
    echo "Unsupported RALPHY_ENGINE: $RALPHY_ENGINE"
    echo "Supported: claude, codex, cursor, opencode, qwen, droid, copilot, gemini, default"
    exit 1
    ;;
esac

if [ -n "$ENGINE_FLAG" ] && [ -n "$RALPHY_MODEL" ]; then
  ralphy "$ENGINE_FLAG" --model "$RALPHY_MODEL" --prd "$TASK_FILE" --max-iterations "$MAX_ITERATIONS"
elif [ -n "$ENGINE_FLAG" ]; then
  ralphy "$ENGINE_FLAG" --prd "$TASK_FILE" --max-iterations "$MAX_ITERATIONS"
elif [ -n "$RALPHY_MODEL" ]; then
  ralphy --model "$RALPHY_MODEL" --prd "$TASK_FILE" --max-iterations "$MAX_ITERATIONS"
else
  ralphy --prd "$TASK_FILE" --max-iterations "$MAX_ITERATIONS"
fi

./scripts/lint.sh || true
./scripts/typecheck.sh || true
./scripts/test.sh || true
./scripts/build.sh || true
