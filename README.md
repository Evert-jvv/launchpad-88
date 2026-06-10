# lp88

`lp88` stands for **Launchpad-88**.

Launchpad-88 is a small npm CLI that installs a repeatable AI-agent workflow into any project.

It creates project instructions, reusable prompts, local skills, scripts, and CI guardrails so your configured agent starts with the same rules instead of rediscovering them.

## Why it exists

Launchpad-88 does not replace your AI agent. It installs the project instructions and guardrails that Codex, Claude, Gemini, OpenCode, Ralphy, or another configured CLI should use.

- `lp88 plan` prints an agent-ready planning prompt.
- `lp88 audit` runs deterministic local checks.
- `skills/code-structure/SKILL.md` guides where logic belongs.
- opensrc is optional for fetching dependency source when package internals matter.
- Greploop is for bounded PR review and CI fix loops.
- Ralphy is optional and should only be used after a clear PRD or issue exists.

## Install

Run without installing:

```sh
npx lp88 init
```

During interactive init, lp88 offers to install optional external tools:

- `opensrc`, from https://github.com/vercel-labs/opensrc
- `ralphy-cli`, from https://github.com/michaelshimeles/ralphy

If supported AI CLIs are detected, lp88 also offers to save:

- a default lp88 planning agent in `.lp88/config.env`
- a default Ralphy engine in `.ralphy/lp88.env`

Skip those prompts with:

```sh
npx lp88 init --no-optional-installs
```

Or install globally:

```sh
npm install -g lp88
lp88 --version
```

## Usage

```sh
npx lp88 init
lp88 doctor
lp88 plan "Improve onboarding flow"
lp88 plan --run --agent codex "Improve onboarding flow"
lp88 audit
```

For local development:

```sh
npm link
lp88 --help
```

## Commands

```sh
npx lp88 init
npx lp88 init --dry-run
npx lp88 init --force
npx lp88 init --no-optional-installs
npx lp88 audit
npx lp88 plan "<task>"
npx lp88 plan --run "<task>"
npx lp88 doctor
npx lp88 help
lp88 --help
lp88 --version
```

`lp88 init` copies templates into the current directory. It skips existing files by default and only overwrites lp88-managed files when `--force` is used.

`lp88 audit` runs `./scripts/audit.sh`. If the script is missing, run `lp88 init` first.

`lp88 plan "task"` prints a prompt you can paste into an agent. It asks the agent to return a combined PRD and implementation plan that can be saved to `docs/prd/current.md`. It uses `.codex/prompts/plan.md` from the current project when present, otherwise it falls back to lp88's vendored template. It does not require any specific agent to be installed.

`lp88 plan --run "task"` calls a configured AI agent CLI directly and writes the returned PRD and implementation plan to `docs/prd/current.md`. Built-in runners currently support `codex`, `claude`, `gemini`, and `opencode`.

`lp88 doctor` checks whether the expected workflow files exist, whether scripts are executable, whether a package manager and git repo are detected, and whether CI is present.

It also reports optional external tools:

```text
✅ opensrc CLI detected
ℹ️ Ralphy CLI not installed (optional; install with `npm install -g ralphy-cli`)
ℹ️ lp88 planning agent: codex
ℹ️ Ralphy engine preference: codex
```

## Recommended Workflow

1. Create or open a project.
2. Run `npx lp88 init`.
3. Run `lp88 doctor`.
4. Run `lp88 plan --run "<task>"` to generate `docs/prd/current.md`.
5. Or run `lp88 plan "<task>"` and paste the output into your agent manually.
6. Review and approve the plan before implementation.
7. Run `lp88 audit`.
8. Open your agent, or use `lp88 plan --run`, and ask it to use AGENTS.md and the relevant skill.
9. Use Greptile/greploop for PR review fixes.
10. Use Ralphy only for bounded implementation loops after a PRD exists.

## Using With Agents

After initialization, start your agent in the project and point it at the installed files:

```text
Use AGENTS.md and skills/audit-repo/SKILL.md. Run ./scripts/audit.sh and give me a prioritized improvement plan.
```

For planning without calling an agent, run:

```sh
lp88 plan "Improve onboarding flow"
```

That prints an agent-ready prompt like:

```text
Use AGENTS.md, skills/plan-project/SKILL.md, and skills/code-structure/SKILL.md.

Task:
Improve onboarding flow

Return a combined PRD and implementation plan that can be saved to:

  docs/prd/current.md

Use this structure:

# PRD

## Goal

## User / Actor

## Problem

## Requirements

## Acceptance Criteria

# Implementation Plan

## Assumptions

## Architecture Impact

## Files Likely To Change

## Implementation Steps

## Tests Required

Rules:
- Do not implement yet.
- Ask only blocking questions.
- Prefer small PR-sized changes.
```

Paste that output into your agent. The agent should return the plan; it should not start implementing until you approve the plan.

After you approve it, save the returned PRD and implementation plan to:

```text
docs/prd/current.md
```

That file is the default input for:

```sh
./scripts/ralphy.sh
```

To have lp88 call the agent directly, run:

```sh
lp88 plan --run --agent codex "Improve onboarding flow"
```

That writes the agent output to:

```text
docs/prd/current.md
```

Built-in planning agents:

```text
codex
claude
gemini
opencode
```

If `--agent` is omitted, lp88 uses:

1. `--agent`
2. `LP88_AGENT`
3. `.lp88/config.env`
4. detected local CLIs

You can pass a model:

```sh
lp88 plan --run --agent codex --model gpt-5.5 "Improve onboarding flow"
lp88 plan --run --agent claude --model claude-sonnet-4-6 "Improve onboarding flow"
lp88 plan --run --agent opencode --model anthropic/claude-sonnet-4-6 "Improve onboarding flow"
```

For agent CLIs without a built-in runner, set `LP88_AGENT_COMMAND`. Use `{prompt}` where lp88 should insert the generated prompt:

```sh
LP88_AGENT_COMMAND='my-agent --print {prompt}' lp88 plan --run "Improve onboarding flow"
```

Example `.lp88/config.env`:

```sh
LP88_AGENT="${LP88_AGENT:-codex}"
LP88_MODEL="${LP88_MODEL:-gpt-5.5}"
```

The per-command flags always win:

```sh
lp88 plan --run --agent gemini "Improve onboarding flow"
lp88 plan --run --agent codex --model gpt-5.5 "Improve onboarding flow"
```

## Greptile And Greploop

Use `skills/greploop/SKILL.md` when a PR has Greptile, CI, or reviewer feedback. The loop is intentionally bounded:

- group feedback by theme
- fix actionable comments only
- run relevant tests
- stop after 3 iterations
- summarize what changed and what remains

## opensrc

opensrc is an optional external tool from https://github.com/vercel-labs/opensrc. It gives coding agents access to dependency source code when public docs and type definitions are not enough.

`lp88` does not depend on opensrc directly. During interactive `lp88 init`, you can choose to install it. To install manually:

```sh
npm install -g opensrc
```

Then run:

```sh
./scripts/opensrc.sh zod
```

The wrapper calls:

```sh
opensrc path "$TARGET"
```

Use `skills/opensrc/SKILL.md` when dependency internals are needed for implementation, debugging, or review.

## Ralphy / Ralph Wiggum

`skills/ralphy-run/SKILL.md` is a custom lp88 safety wrapper skill around the upstream Ralphy project: https://github.com/michaelshimeles/ralphy

Ralphy is an implementation grinder, not the architect. Use it only after a clear PRD, issue, or approved implementation plan exists.

`lp88` does not depend on Ralphy directly. To use the wrapper, install Ralphy separately:

```sh
npm install -g ralphy-cli
```

Then run:

```sh
MAX_ITERATIONS=3 ./scripts/ralphy.sh docs/prd/current.md
```

The wrapper calls:

```sh
ralphy --prd "$TASK_FILE" --max-iterations "$MAX_ITERATIONS"
```

You can configure the engine in `.ralphy/lp88.env`:

```sh
RALPHY_ENGINE="${RALPHY_ENGINE:-codex}"
RALPHY_MODEL="${RALPHY_MODEL:-}"
```

Or override it per run:

```sh
RALPHY_ENGINE=cursor RALPHY_MODEL=composer-2.5 ./scripts/ralphy.sh docs/prd/current.md
```

Supported engine values:

```text
claude, codex, cursor, opencode, qwen, droid, copilot, gemini, default
```

With `RALPHY_ENGINE=codex`, the wrapper calls:

```sh
ralphy --codex --prd "$TASK_FILE" --max-iterations "$MAX_ITERATIONS"
```

## Code Structure Skill

`skills/code-structure/SKILL.md` helps decide what belongs in actions, services, utilities, and routes/controllers:

- actions orchestrate workflows and business rules
- services contain reusable operational mechanics
- utilities are pure helpers
- controllers and routes stay thin
- shared abstractions should earn their keep

## Vendored Skills

`skills/code-structure/SKILL.md` is vendored into lp88 for deterministic installs.

- Vendored file: `skills/code-structure/SKILL.md`
- Source URL: `https://raw.githubusercontent.com/michaelshimeles/skills/main/code-structure/SKILL.md`
- Runtime behavior: `lp88 init` copies the local vendored file from this package and does not fetch it from GitHub.

Users should review third-party skill files before trusting them.

## Safety Rules

The installed AGENTS.md tells agents to:

- plan before broad changes
- prefer PR-sized changes
- avoid unrelated refactors
- avoid new dependencies unless justified
- never commit secrets
- never weaken security checks to make tests pass
- ask before destructive operations
- treat auth, authorization, payments, data deletion, migrations, encryption, secrets, and security-sensitive code as high risk

## Updating Templates

Edit files under `templates/`. `lp88 init` copies this directory into the target project.

To update the vendored code-structure skill, fetch the source raw GitHub file during lp88 package development and commit the resulting `templates/skills/code-structure/SKILL.md`. Do not add runtime fetching to `lp88 init`.

To customize the planning prompt for a project, edit `.codex/prompts/plan.md`. Keep `{{TASK}}` where the task should be inserted. If the placeholder is missing, `lp88 plan` appends the task at the end.
