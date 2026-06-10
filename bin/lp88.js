#!/usr/bin/env node

import { spawn } from "node:child_process";
import { chmod, copyFile, mkdir, readdir, readFile, stat } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const packageRoot = path.resolve(path.dirname(__filename), "..");
const templatesRoot = path.join(packageRoot, "templates");

const requiredFiles = [
  "AGENTS.md",
  ".codex/config.toml",
  ".codex/prompts/plan.md",
  ".codex/prompts/audit.md",
  ".codex/prompts/ship.md",
  ".codex/prompts/greploop.md",
  ".codex/prompts/ralphy.md",
  "skills/plan-project/SKILL.md",
  "skills/audit-repo/SKILL.md",
  "skills/code-structure/SKILL.md",
  "skills/greploop/SKILL.md",
  "skills/ralphy-run/SKILL.md",
  "scripts/setup.sh",
  "scripts/lint.sh",
  "scripts/typecheck.sh",
  "scripts/test.sh",
  "scripts/build.sh",
  "scripts/audit.sh",
  "scripts/ralphy.sh",
  ".github/workflows/ci.yml"
];

const scriptFiles = [
  "scripts/setup.sh",
  "scripts/lint.sh",
  "scripts/typecheck.sh",
  "scripts/test.sh",
  "scripts/build.sh",
  "scripts/audit.sh",
  "scripts/ralphy.sh"
];

async function main() {
  try {
    const args = process.argv.slice(2);
    const command = args[0] ?? "help";

    if (command === "--help" || command === "-h" || command === "help") {
      printHelp();
      return;
    }

    if (command === "--version" || command === "-v") {
      console.log(await getVersion());
      return;
    }

    if (command === "init") {
      await init(args.slice(1));
      return;
    }

    if (command === "audit") {
      await audit();
      return;
    }

    if (command === "plan") {
      plan(args.slice(1));
      return;
    }

    if (command === "doctor") {
      await doctor();
      return;
    }

    console.error(`Unknown command: ${command}`);
    console.error("");
    printHelp();
    process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

async function getVersion() {
  const pkg = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  return pkg.version;
}

async function init(args) {
  const unknown = args.filter((arg) => !["--dry-run", "--force"].includes(arg));
  if (unknown.length > 0) {
    console.error(`Unknown init option: ${unknown[0]}`);
    console.error("");
    console.error("Usage: lp88 init [--dry-run] [--force]");
    process.exitCode = 1;
    return;
  }

  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const targetRoot = process.cwd();
  const files = await listTemplateFiles(templatesRoot);

  for (const templateFile of files) {
    const relativePath = path.relative(templatesRoot, templateFile);
    const targetFile = path.join(targetRoot, relativePath);
    const displayPath = toDisplayPath(relativePath);
    const exists = existsSync(targetFile);

    if (dryRun) {
      if (exists && force) {
        console.log(`Would overwrite: ${displayPath}`);
      } else if (exists) {
        console.log(`Would skip existing: ${displayPath}`);
      } else {
        console.log(`Would create: ${displayPath}`);
      }
      continue;
    }

    if (exists && !force) {
      console.log(`Skipping existing: ${displayPath}`);
      continue;
    }

    await mkdir(path.dirname(targetFile), { recursive: true });
    await copyFile(templateFile, targetFile);

    if (isScript(relativePath)) {
      await chmod(targetFile, 0o755);
    }

    console.log(exists ? `Overwritten: ${displayPath}` : `Created: ${displayPath}`);
  }

  if (!dryRun) {
    printNextSteps();
  }
}

async function listTemplateFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listTemplateFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function isScript(relativePath) {
  return relativePath.startsWith(`scripts${path.sep}`) && relativePath.endsWith(".sh");
}

function toDisplayPath(filePath) {
  return filePath.split(path.sep).join("/");
}

async function audit() {
  const script = path.join(process.cwd(), "scripts", "audit.sh");
  if (!existsSync(script)) {
    console.error("scripts/audit.sh was not found.");
    console.error("Run `lp88 init` first.");
    process.exitCode = 1;
    return;
  }

  await new Promise((resolve) => {
    const child = spawn(script, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: false
    });

    child.on("error", (error) => {
      console.error(`Failed to run scripts/audit.sh: ${error.message}`);
      process.exitCode = 1;
      resolve();
    });

    child.on("close", (code) => {
      process.exitCode = code ?? 1;
      resolve();
    });
  });
}

function plan(args) {
  const task = args.join(" ").trim();

  if (!task) {
    console.log('Usage: lp88 plan "Add billing dashboard"');
    return;
  }

  console.log(`Use AGENTS.md, skills/plan-project/SKILL.md, and skills/code-structure/SKILL.md.

Plan the following task:

${task}

Return:
- goal
- assumptions
- architecture impact
- implementation steps
- files likely to change
- tests required
- risks
- recommended first PR

Rules:
- Do not implement yet.
- Ask only blocking questions.
- Prefer small PR-sized changes.
- Follow the code-structure skill when deciding what belongs in actions, services, utilities, and routes/controllers.`);
}

async function doctor() {
  let importantMissing = false;

  for (const file of requiredFiles) {
    const ok = existsSync(path.join(process.cwd(), file));
    if (!ok) importantMissing = true;
    printRequiredCheck(ok, file);
  }

  for (const file of scriptFiles) {
    const executable = await isExecutable(path.join(process.cwd(), file));
    if (!executable) importantMissing = true;
    printRequiredCheck(executable, `${file} executable`);
  }

  const packageManager = detectPackageManager(process.cwd());
  if (packageManager) {
    console.log(`✅ Package manager detected: ${packageManager}`);
  } else {
    importantMissing = true;
    console.log("⚠️ No package manager detected");
  }

  const gitRepo = hasGitRepo(process.cwd());
  if (!gitRepo) importantMissing = true;
  console.log(gitRepo ? "✅ Git repo detected" : "⚠️ No git repo detected");

  console.log("");
  console.log(importantMissing ? "Needs attention" : "Healthy");
}

async function isExecutable(file) {
  try {
    const mode = (await stat(file)).mode;
    return (mode & constants.X_OK) !== 0;
  } catch {
    return false;
  }
}

function detectPackageManager(root) {
  if (existsSync(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(path.join(root, "package-lock.json"))) return "npm";
  if (existsSync(path.join(root, "yarn.lock"))) return "yarn";
  if (existsSync(path.join(root, "bun.lockb")) || existsSync(path.join(root, "bun.lock"))) return "bun";
  if (existsSync(path.join(root, "package.json"))) return "npm";
  return null;
}

function hasGitRepo(start) {
  let current = start;

  while (true) {
    if (existsSync(path.join(current, ".git"))) return true;
    const parent = path.dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}

function printRequiredCheck(ok, label) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
}

function printNextSteps() {
  console.log("");
  console.log("lp88 installed the agent workflow.");
  console.log("");
  console.log("Next:");
  console.log("  lp88 doctor");
  console.log("  lp88 audit");
  console.log("  codex");
  console.log("");
  console.log("Suggested Codex prompt:");
  console.log("  Use AGENTS.md and skills/audit-repo/SKILL.md. Run ./scripts/audit.sh and give me a prioritized improvement plan.");
}

function printHelp() {
  console.log(`lp88

Bootstrap a Codex/agent workflow into the current project.

Usage:
  lp88 init
  lp88 init --dry-run
  lp88 init --force
  lp88 audit
  lp88 plan "Add billing dashboard"
  lp88 doctor
  lp88 help
  lp88 --help
  lp88 --version

Commands:
  init       Copy AGENTS.md, Codex prompts, skills, scripts, and CI into this project.
  audit      Run ./scripts/audit.sh.
  plan       Print a Codex-ready planning prompt for a task.
  doctor     Check whether the lp88 workflow files are installed.
  help       Show this help text.

Examples:
  npx lp88 init
  lp88 doctor
  lp88 plan "Add billing dashboard"
  lp88 audit`);
}

await main();
