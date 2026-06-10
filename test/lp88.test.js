import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(repoRoot, "bin", "lp88.js");

function runLp88(args, cwd, env = {}) {
  return new Promise((resolve) => {
    execFile(process.execPath, [cli, ...args], { cwd, env: { ...process.env, ...env } }, (error, stdout, stderr) => {
      resolve({
        code: error?.code ?? 0,
        stdout,
        stderr
      });
    });
  });
}

async function withTempProject(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "lp88-test-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("init dry-run reports actions without writing files", async () => {
  await withTempProject(async (dir) => {
    const result = await runLp88(["init", "--dry-run"], dir);

    assert.equal(result.code, 0);
    assert.match(result.stdout, /Would create: AGENTS\.md/);
    assert.equal(existsSync(path.join(dir, "AGENTS.md")), false);
  });
});

test("init creates templates and executable scripts", async () => {
  await withTempProject(async (dir) => {
    const result = await runLp88(["init"], dir);

    assert.equal(result.code, 0);
    assert.match(result.stdout, /Created: AGENTS\.md/);
    assert.match(result.stdout, /Launchpad-88 installed the agent workflow/);
    assert.equal(existsSync(path.join(dir, "skills", "code-structure", "SKILL.md")), true);
    assert.equal(existsSync(path.join(dir, "skills", "opensrc", "SKILL.md")), true);
    assert.equal(existsSync(path.join(dir, "docs", "prd", "current.md")), true);

    const mode = (await stat(path.join(dir, "scripts", "audit.sh"))).mode;
    assert.equal(Boolean(mode & 0o111), true);
  });
});

test("init installs ralphy wrapper with upstream command", async () => {
  await withTempProject(async (dir) => {
    await runLp88(["init"], dir);

    const script = await readFile(path.join(dir, "scripts", "ralphy.sh"), "utf8");

    assert.match(script, /npm install -g ralphy-cli/);
    assert.match(script, /RALPHY_ENGINE="\$\{RALPHY_ENGINE:-}"/);
    assert.match(script, /codex\) ENGINE_FLAG="--codex"/);
    assert.match(script, /ralphy "\$ENGINE_FLAG" --model "\$RALPHY_MODEL" --prd "\$TASK_FILE" --max-iterations "\$MAX_ITERATIONS"/);
  });
});

test("init installs opensrc wrapper with upstream command", async () => {
  await withTempProject(async (dir) => {
    await runLp88(["init"], dir);

    const script = await readFile(path.join(dir, "scripts", "opensrc.sh"), "utf8");

    assert.match(script, /npm install -g opensrc/);
    assert.match(script, /opensrc path "\$TARGET"/);
  });
});

test("init skips existing files unless force is used", async () => {
  await withTempProject(async (dir) => {
    await writeFile(path.join(dir, "AGENTS.md"), "custom\n");

    const skipped = await runLp88(["init"], dir);
    assert.match(skipped.stdout, /Skipping existing: AGENTS\.md/);
    assert.equal(await readFile(path.join(dir, "AGENTS.md"), "utf8"), "custom\n");

    const forced = await runLp88(["init", "--force"], dir);
    assert.match(forced.stdout, /Overwritten: AGENTS\.md/);
    assert.match(await readFile(path.join(dir, "AGENTS.md"), "utf8"), /^# AGENTS\.md/);
  });
});

test("plan prints a Codex-ready prompt", async () => {
  await withTempProject(async (dir) => {
    const result = await runLp88(["plan", "Improve", "onboarding", "flow"], dir);

    assert.equal(result.code, 0);
    assert.match(result.stdout, /Task:/);
    assert.match(result.stdout, /Improve onboarding flow/);
    assert.match(result.stdout, /combined PRD and implementation plan/);
    assert.match(result.stdout, /docs\/prd\/current\.md/);
    assert.match(result.stdout, /Recommended First PR/);
  });
});

test("plan without a task prints generic usage", async () => {
  await withTempProject(async (dir) => {
    const result = await runLp88(["plan"], dir);

    assert.equal(result.code, 0);
    assert.match(result.stdout, /Usage: lp88 plan \[--run]/);
    assert.match(result.stdout, /Example: lp88 plan "Improve onboarding flow"/);
    assert.doesNotMatch(result.stdout, /Add billing dashboard/);
  });
});

test("plan uses the project prompt template when present", async () => {
  await withTempProject(async (dir) => {
    await mkdir(path.join(dir, ".codex", "prompts"), { recursive: true });
    await writeFile(path.join(dir, ".codex", "prompts", "plan.md"), "Custom plan:\n{{TASK}}\n");

    const result = await runLp88(["plan", "Ship", "search"], dir);

    assert.equal(result.code, 0);
    assert.equal(result.stdout, "Custom plan:\nShip search\n");
  });
});

test("plan appends the task when a project prompt has no placeholder", async () => {
  await withTempProject(async (dir) => {
    await mkdir(path.join(dir, ".codex", "prompts"), { recursive: true });
    await writeFile(path.join(dir, ".codex", "prompts", "plan.md"), "Custom plan without placeholder\n");

    const result = await runLp88(["plan", "Ship", "search"], dir);

    assert.equal(result.code, 0);
    assert.equal(result.stdout, "Custom plan without placeholder\n\nTask:\nShip search\n");
  });
});

test("plan --run calls an agent and writes docs/prd/current.md", async () => {
  await withTempProject(async (dir) => {
    const binDir = path.join(dir, "bin");
    await mkdir(binDir);
    const fakeGemini = path.join(binDir, "gemini");
    await writeFile(fakeGemini, '#!/usr/bin/env sh\nprintf "%s\\n" "# PRD" "" "## Goal" "" "Generated by fake agent"\n');
    await chmod(fakeGemini, 0o755);

    const result = await runLp88(
      ["plan", "--run", "--agent", "gemini", "Ship", "search"],
      dir,
      { PATH: `${binDir}${path.delimiter}${process.env.PATH}` }
    );

    assert.equal(result.code, 0);
    assert.match(result.stdout, /Running planning prompt with gemini/);
    assert.match(result.stdout, /Wrote PRD and implementation plan: docs\/prd\/current\.md/);
    assert.match(await readFile(path.join(dir, "docs", "prd", "current.md"), "utf8"), /Generated by fake agent/);
  });
});

test("plan --run supports claude", async () => {
  await withTempProject(async (dir) => {
    const binDir = path.join(dir, "bin");
    await mkdir(binDir);
    const fakeClaude = path.join(binDir, "claude");
    await writeFile(fakeClaude, '#!/usr/bin/env sh\nprintf "%s\\n" "# PRD" "" "## Goal" "" "Generated by fake claude"\n');
    await chmod(fakeClaude, 0o755);

    const result = await runLp88(
      ["plan", "--run", "--agent", "claude", "--model", "sonnet-test", "Ship", "search"],
      dir,
      { PATH: `${binDir}${path.delimiter}${process.env.PATH}` }
    );

    assert.equal(result.code, 0);
    assert.match(result.stdout, /Running planning prompt with claude \(sonnet-test\)/);
    assert.match(await readFile(path.join(dir, "docs", "prd", "current.md"), "utf8"), /Generated by fake claude/);
  });
});

test("plan --run supports opencode", async () => {
  await withTempProject(async (dir) => {
    const binDir = path.join(dir, "bin");
    await mkdir(binDir);
    const fakeOpenCode = path.join(binDir, "opencode");
    await writeFile(fakeOpenCode, '#!/usr/bin/env sh\nprintf "%s\\n" "# PRD" "" "## Goal" "" "Generated by fake opencode"\n');
    await chmod(fakeOpenCode, 0o755);

    const result = await runLp88(
      ["plan", "--run", "--agent", "opencode", "--model", "provider/model-test", "Ship", "search"],
      dir,
      { PATH: `${binDir}${path.delimiter}${process.env.PATH}` }
    );

    assert.equal(result.code, 0);
    assert.match(result.stdout, /Running planning prompt with opencode \(provider\/model-test\)/);
    assert.match(await readFile(path.join(dir, "docs", "prd", "current.md"), "utf8"), /Generated by fake opencode/);
  });
});

test("plan --run --stdout prints agent output without writing", async () => {
  await withTempProject(async (dir) => {
    const binDir = path.join(dir, "bin");
    await mkdir(binDir);
    const fakeGemini = path.join(binDir, "gemini");
    await writeFile(fakeGemini, '#!/usr/bin/env sh\nprintf "%s\\n" "# PRD" "" "## Goal" "" "Stdout only"\n');
    await chmod(fakeGemini, 0o755);

    const result = await runLp88(
      ["plan", "--run", "--stdout", "--agent", "gemini", "Ship", "search"],
      dir,
      { PATH: `${binDir}${path.delimiter}${process.env.PATH}` }
    );

    assert.equal(result.code, 0);
    assert.match(result.stdout, /Stdout only/);
    assert.equal(existsSync(path.join(dir, "docs", "prd", "current.md")), false);
  });
});

test("plan --run uses .lp88 config when no agent flag is passed", async () => {
  await withTempProject(async (dir) => {
    const binDir = path.join(dir, "bin");
    await mkdir(binDir);
    await mkdir(path.join(dir, ".lp88"));
    const fakeGemini = path.join(binDir, "gemini");
    await writeFile(fakeGemini, '#!/usr/bin/env sh\nprintf "%s\\n" "# PRD" "" "## Goal" "" "Configured agent"\n');
    await chmod(fakeGemini, 0o755);
    await writeFile(path.join(dir, ".lp88", "config.env"), 'LP88_AGENT="${LP88_AGENT:-gemini}"\nLP88_MODEL="${LP88_MODEL:-flash-test}"\n');

    const result = await runLp88(
      ["plan", "--run", "Ship", "search"],
      dir,
      { PATH: `${binDir}${path.delimiter}${process.env.PATH}` }
    );

    assert.equal(result.code, 0);
    assert.match(result.stdout, /Running planning prompt with gemini \(flash-test\)/);
    assert.match(await readFile(path.join(dir, "docs", "prd", "current.md"), "utf8"), /Configured agent/);
  });
});

test("audit reports missing script cleanly", async () => {
  await withTempProject(async (dir) => {
    const result = await runLp88(["audit"], dir);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /scripts\/audit\.sh was not found/);
    assert.doesNotMatch(result.stderr, /Error:/);
  });
});

test("audit runs after init and writes audit artifacts", async () => {
  await withTempProject(async (dir) => {
    await runLp88(["init"], dir);

    const result = await runLp88(["audit"], dir);

    assert.equal(result.code, 0);
    assert.match(result.stdout, /Audit results saved to \.audit\//);
    assert.equal(existsSync(path.join(dir, ".audit", "summary.txt")), true);
    assert.equal(existsSync(path.join(dir, ".audit", "large-files.txt")), true);
  });
});

test("doctor reports healthy after init in a git project", async () => {
  await withTempProject(async (dir) => {
    await mkdir(path.join(dir, ".git"));
    await mkdir(path.join(dir, ".ralphy"));
    await mkdir(path.join(dir, ".lp88"));
    await writeFile(path.join(dir, "package.json"), "{}\n");
    await writeFile(path.join(dir, ".ralphy", "lp88.env"), 'RALPHY_ENGINE="${RALPHY_ENGINE:-codex}"\n');
    await writeFile(path.join(dir, ".lp88", "config.env"), 'LP88_AGENT="${LP88_AGENT:-codex}"\nLP88_MODEL="${LP88_MODEL:-gpt-5.5}"\n');
    await runLp88(["init"], dir);

    const result = await runLp88(["doctor"], dir);

    assert.equal(result.code, 0);
    assert.match(result.stdout, /✅ AGENTS\.md/);
    assert.match(result.stdout, /✅ Package manager detected: npm/);
    assert.match(result.stdout, /Ralphy CLI/);
    assert.match(result.stdout, /opensrc CLI/);
    assert.match(result.stdout, /lp88 planning agent: codex \(gpt-5\.5\)/);
    assert.match(result.stdout, /Ralphy engine preference: codex/);
    assert.match(result.stdout, /Healthy/);
  });
});
