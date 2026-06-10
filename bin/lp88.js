#!/usr/bin/env node

import { spawn } from "node:child_process";
import { chmod, copyFile, mkdir, readdir, readFile, stat } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
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
  "skills/opensrc/SKILL.md",
  "skills/ralphy-run/SKILL.md",
  "scripts/setup.sh",
  "scripts/lint.sh",
  "scripts/typecheck.sh",
  "scripts/test.sh",
  "scripts/build.sh",
  "scripts/audit.sh",
  "scripts/opensrc.sh",
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
  "scripts/opensrc.sh",
  "scripts/ralphy.sh"
];

const optionalTools = [
  {
    label: "opensrc",
    command: "opensrc",
    packageName: "opensrc",
    installArgs: ["install", "-g", "opensrc"],
    source: "https://github.com/vercel-labs/opensrc"
  },
  {
    label: "Ralphy CLI",
    command: "ralphy",
    packageName: "ralphy-cli",
    installArgs: ["install", "-g", "ralphy-cli"],
    source: "https://github.com/michaelshimeles/ralphy"
  }
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
      await plan(args.slice(1));
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
  const allowedOptions = ["--dry-run", "--force", "--no-optional-installs"];
  const unknown = args.filter((arg) => !allowedOptions.includes(arg));
  if (unknown.length > 0) {
    console.error(`Unknown init option: ${unknown[0]}`);
    console.error("");
    console.error("Usage: lp88 init [--dry-run] [--force] [--no-optional-installs]");
    process.exitCode = 1;
    return;
  }

  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const skipOptionalInstalls = args.includes("--no-optional-installs");
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
    await offerOptionalToolInstalls({ skip: skipOptionalInstalls });
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

async function plan(args) {
  const task = args.join(" ").trim();

  if (!task) {
    console.log('Usage: lp88 plan "<task>"');
    console.log('Example: lp88 plan "Improve onboarding flow"');
    return;
  }

  const prompt = await loadPlanPrompt();
  const rendered = prompt.includes("{{TASK}}")
    ? prompt.replaceAll("{{TASK}}", task)
    : `${prompt.trimEnd()}\n\nTask:\n${task}`;

  console.log(rendered.trimEnd());
}

async function loadPlanPrompt() {
  const localPrompt = path.join(process.cwd(), ".codex", "prompts", "plan.md");
  if (existsSync(localPrompt)) {
    return readFile(localPrompt, "utf8");
  }

  return readFile(path.join(templatesRoot, ".codex", "prompts", "plan.md"), "utf8");
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

  const ralphyInstalled = await hasCommand("ralphy");
  if (ralphyInstalled) {
    console.log("✅ Ralphy CLI detected");
  } else {
    console.log("ℹ️ Ralphy CLI not installed (optional; install with `npm install -g ralphy-cli`)");
  }

  const opensrcInstalled = await hasCommand("opensrc");
  if (opensrcInstalled) {
    console.log("✅ opensrc CLI detected");
  } else {
    console.log("ℹ️ opensrc CLI not installed (optional; install with `npm install -g opensrc`)");
  }

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

async function hasCommand(command) {
  return new Promise((resolve) => {
    const child = spawn("sh", ["-c", `command -v ${command} >/dev/null 2>&1`], {
      stdio: "ignore"
    });

    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

async function offerOptionalToolInstalls({ skip }) {
  if (skip) {
    return;
  }

  const missingTools = [];
  for (const tool of optionalTools) {
    if (!await hasCommand(tool.command)) {
      missingTools.push(tool);
    }
  }

  if (missingTools.length === 0) {
    console.log("");
    console.log("Optional tools detected: opensrc and Ralphy CLI.");
    return;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log("");
    console.log("Optional tools not installed:");
    for (const tool of missingTools) {
      console.log(`  ${tool.label}: npm install -g ${tool.packageName}`);
    }
    console.log("Run those commands later if you want the optional integrations.");
    return;
  }

  console.log("");
  console.log("Optional tools");

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    for (const tool of missingTools) {
      const answer = await rl.question(`Install ${tool.label} now? (npm install -g ${tool.packageName}) [y/N] `);
      if (!isYes(answer)) {
        console.log(`Skipped ${tool.label}. Install later with: npm install -g ${tool.packageName}`);
        continue;
      }

      await installOptionalTool(tool);
    }
  } finally {
    rl.close();
  }
}

function isYes(value) {
  return ["y", "yes"].includes(value.trim().toLowerCase());
}

async function installOptionalTool(tool) {
  console.log(`Installing ${tool.label}...`);

  await new Promise((resolve) => {
    const child = spawn("npm", tool.installArgs, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: false
    });

    child.on("error", (error) => {
      console.error(`Failed to install ${tool.label}: ${error.message}`);
      console.error(`Install later with: npm install -g ${tool.packageName}`);
      resolve();
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`Installed ${tool.label}.`);
      } else {
        console.error(`Failed to install ${tool.label} (exit ${code}).`);
        console.error(`Install later with: npm install -g ${tool.packageName}`);
      }
      resolve();
    });
  });
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
  lp88 init --no-optional-installs
  lp88 audit
  lp88 plan "<task>"
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
  lp88 plan "Improve onboarding flow"
  lp88 audit`);
}

await main();
