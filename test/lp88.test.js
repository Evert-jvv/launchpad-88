import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(repoRoot, "bin", "lp88.js");

function runLp88(args, cwd) {
  return new Promise((resolve) => {
    execFile(process.execPath, [cli, ...args], { cwd }, (error, stdout, stderr) => {
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
    assert.match(result.stdout, /lp88 installed the agent workflow/);
    assert.equal(existsSync(path.join(dir, "skills", "code-structure", "SKILL.md")), true);
    assert.equal(existsSync(path.join(dir, "skills", "opensrc", "SKILL.md")), true);

    const mode = (await stat(path.join(dir, "scripts", "audit.sh"))).mode;
    assert.equal(Boolean(mode & 0o111), true);
  });
});

test("init installs ralphy wrapper with upstream command", async () => {
  await withTempProject(async (dir) => {
    await runLp88(["init"], dir);

    const script = await readFile(path.join(dir, "scripts", "ralphy.sh"), "utf8");

    assert.match(script, /npm install -g ralphy-cli/);
    assert.match(script, /ralphy --prd "\$TASK_FILE" --max-iterations "\$MAX_ITERATIONS"/);
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
    assert.match(result.stdout, /recommended first PR/);
  });
});

test("plan without a task prints generic usage", async () => {
  await withTempProject(async (dir) => {
    const result = await runLp88(["plan"], dir);

    assert.equal(result.code, 0);
    assert.match(result.stdout, /Usage: lp88 plan "<task>"/);
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
    await writeFile(path.join(dir, "package.json"), "{}\n");
    await runLp88(["init"], dir);

    const result = await runLp88(["doctor"], dir);

    assert.equal(result.code, 0);
    assert.match(result.stdout, /✅ AGENTS\.md/);
    assert.match(result.stdout, /✅ Package manager detected: npm/);
    assert.match(result.stdout, /Ralphy CLI/);
    assert.match(result.stdout, /opensrc CLI/);
    assert.match(result.stdout, /Healthy/);
  });
});
