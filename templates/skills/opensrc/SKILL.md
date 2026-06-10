---
name: opensrc
description: Fetch and inspect dependency source code when package internals are needed for implementation, debugging, or review.
---

# opensrc

Use this skill when type definitions, public docs, or local usage are not enough to understand a dependency.

opensrc is optional and external to lp88.

Upstream opensrc:

- GitHub: https://github.com/vercel-labs/opensrc
- npm package: `opensrc`
- CLI command: `opensrc`
- Recommended install: `npm install -g opensrc`

## Good uses

- inspecting how a dependency implements an API
- debugging behavior that is not explained by docs
- finding examples inside a package source tree
- checking exported code before wrapping or extending it
- comparing source behavior with local assumptions

## Bad uses

- fetching source for every dependency by default
- replacing official docs with assumptions from old source
- copying third-party code into the project without license review
- making network calls during unrelated tasks
- modifying project config without explicit approval

## Process

1. Confirm the dependency internals are needed.
2. Confirm the `opensrc` command is installed.
3. Run `./scripts/opensrc.sh <package-or-repo>`.
4. Inspect only the relevant files.
5. Summarize what was learned and cite the package path inspected.
6. Avoid copying third-party code unless licensing and attribution are explicitly handled.

## Examples

```sh
./scripts/opensrc.sh zod
./scripts/opensrc.sh vercel/next.js
```

## Output

Return:

- package or repo inspected
- files inspected
- relevant findings
- impact on the implementation plan
- risks or licensing notes
