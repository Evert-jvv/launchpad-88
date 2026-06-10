# lp88

`lp88` is a small npm CLI that installs a repeatable Codex and coding-agent workflow into any project.

It creates the project instructions, Codex prompts, local skills, scripts, and CI guardrails I want in every repo so the next agent starts with the same rules instead of rediscovering them.

## Why it exists

`lp88` does not replace Codex. It installs the project instructions and guardrails Codex should use.

- `lp88 plan` prints a Codex-ready planning prompt.
- `lp88 audit` runs deterministic local checks.
- `skills/code-structure/SKILL.md` guides where logic belongs.
- Greploop is for bounded PR review and CI fix loops.
- Ralphy is optional and should only be used after a clear PRD or issue exists.

## Usage

```sh
npx lp88 init
lp88 doctor
lp88 plan "Add billing dashboard"
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
npx lp88 audit
npx lp88 plan "Add billing dashboard"
npx lp88 doctor
npx lp88 help
lp88 --help
lp88 --version
```

`lp88 init` copies templates into the current directory. It skips existing files by default and only overwrites lp88-managed files when `--force` is used.

`lp88 audit` runs `./scripts/audit.sh`. If the script is missing, run `lp88 init` first.

`lp88 plan "task"` prints a prompt you can paste into Codex. It does not require Codex to be installed.

`lp88 doctor` checks whether the expected workflow files exist, whether scripts are executable, whether a package manager and git repo are detected, and whether CI is present.

## Recommended Workflow

1. Create or open a project.
2. Run `npx lp88 init`.
3. Run `lp88 doctor`.
4. Run `lp88 audit`.
5. Open Codex and ask it to use AGENTS.md and the relevant skill.
6. Use Greptile/greploop for PR review fixes.
7. Use Ralphy only for bounded implementation loops after a PRD exists.

## Using With Codex

After initialization, start Codex in the project and point it at the installed files:

```text
Use AGENTS.md and skills/audit-repo/SKILL.md. Run ./scripts/audit.sh and give me a prioritized improvement plan.
```

For planning:

```sh
lp88 plan "Add billing dashboard"
```

Then paste the generated prompt into Codex.

## Greptile And Greploop

Use `skills/greploop/SKILL.md` when a PR has Greptile, CI, or reviewer feedback. The loop is intentionally bounded:

- group feedback by theme
- fix actionable comments only
- run relevant tests
- stop after 3 iterations
- summarize what changed and what remains

## Ralphy / Ralph Wiggum

`skills/ralphy-run/SKILL.md` is a custom lp88 safety wrapper skill. It is not copied from upstream Ralphy documentation.

Ralphy is an implementation grinder, not the architect. Use it only after a clear PRD, issue, or approved implementation plan exists. The template `scripts/ralphy.sh` contains a placeholder command until you provide the exact local Ralphy command.

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

## Publishing Later

Before publishing:

```sh
npm test
npm pack --dry-run
npm publish --access public
```

The package exposes the CLI with:

```json
{
  "bin": {
    "lp88": "./bin/lp88.js"
  }
}
```
