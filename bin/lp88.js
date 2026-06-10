#!/usr/bin/env node

import { spawn } from "node:child_process";
import { chmod, copyFile, mkdir, mkdtemp, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import os from "node:os";
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
  "docs/prd/current.md",
  ".github/workflows/ci.yml"
];

const lp88ConfigFile = ".lp88/config.env";
const ralphyConfigFile = ".ralphy/lp88.env";

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

const ralphyEngines = [
  {
    key: "codex",
    label: "Codex",
    command: "codex",
    flag: "--codex"
  },
  {
    key: "cursor",
    label: "Cursor agent",
    command: "agent",
    flag: "--cursor"
  },
  {
    key: "claude",
    label: "Claude Code",
    command: "claude",
    flag: "--claude"
  },
  {
    key: "opencode",
    label: "OpenCode",
    command: "opencode",
    flag: "--opencode"
  },
  {
    key: "qwen",
    label: "Qwen-Code",
    command: "qwen",
    flag: "--qwen"
  },
  {
    key: "droid",
    label: "Factory Droid",
    command: "droid",
    flag: "--droid"
  },
  {
    key: "copilot",
    label: "GitHub Copilot",
    command: "copilot",
    flag: "--copilot"
  },
  {
    key: "gemini",
    label: "Gemini CLI",
    command: "gemini",
    flag: "--gemini"
  }
];

const planningAgents = [
  {
    key: "codex",
    label: "Codex",
    command: "codex"
  },
  {
    key: "claude",
    label: "Claude Code",
    command: "claude"
  },
  {
    key: "gemini",
    label: "Gemini CLI",
    command: "gemini"
  },
  {
    key: "opencode",
    label: "OpenCode",
    command: "opencode"
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
    await offerLp88AgentConfig({ skip: skipOptionalInstalls, force });
    await offerRalphyEngineConfig({ skip: skipOptionalInstalls, force });
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
  const parsed = parsePlanArgs(args);

  if (parsed.error) {
    console.error(parsed.error);
    console.error("");
    printPlanUsage();
    process.exitCode = 1;
    return;
  }

  const task = parsed.task;

  if (!task) {
    printPlanUsage();
    return;
  }

  const prompt = await loadPlanPrompt();
  const rendered = prompt.includes("{{TASK}}")
    ? prompt.replaceAll("{{TASK}}", task)
    : `${prompt.trimEnd()}\n\nTask:\n${task}`;

  if (!parsed.run) {
    console.log(rendered.trimEnd());
    return;
  }

  await runPlanWithAgent(rendered.trimEnd(), parsed);
}

function parsePlanArgs(args) {
  const parsed = {
    run: false,
    stdout: false,
    agent: null,
    model: null,
    outFile: "docs/prd/current.md",
    taskParts: []
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--run") {
      parsed.run = true;
    } else if (arg === "--stdout") {
      parsed.stdout = true;
    } else if (arg === "--agent") {
      const value = args[index + 1];
      if (!value) return { error: "--agent requires a value" };
      parsed.agent = value;
      index += 1;
    } else if (arg === "--model") {
      const value = args[index + 1];
      if (!value) return { error: "--model requires a value" };
      parsed.model = value;
      index += 1;
    } else if (arg === "--out") {
      const value = args[index + 1];
      if (!value) return { error: "--out requires a value" };
      parsed.outFile = value;
      index += 1;
    } else if (arg.startsWith("--")) {
      return { error: `Unknown plan option: ${arg}` };
    } else {
      parsed.taskParts.push(arg);
    }
  }

  return {
    ...parsed,
    task: parsed.taskParts.join(" ").trim()
  };
}

function printPlanUsage() {
  console.log('Usage: lp88 plan [--run] [--agent codex|claude|gemini|opencode] [--model <model>] [--out <file>] "<task>"');
  console.log('Example: lp88 plan "Improve onboarding flow"');
  console.log('Example: lp88 plan --run --agent codex "Improve onboarding flow"');
}

async function runPlanWithAgent(prompt, options) {
  const lp88Config = await readLp88Config(process.cwd());
  const agent = options.agent ?? process.env.LP88_AGENT ?? lp88Config.agent ?? await detectPlanningAgent();
  if (!agent) {
    console.error("No supported AI agent CLI was detected.");
    console.error("Install Codex, Claude Code, Gemini, or OpenCode, or pass --agent.");
    process.exitCode = 1;
    return;
  }

  const model = options.model ?? process.env.LP88_MODEL ?? lp88Config.model ?? null;
  console.log(`Running planning prompt with ${agent}${model ? ` (${model})` : ""}...`);

  const result = await runAgentCommand(agent, prompt, { model });
  if (result.code !== 0) {
    console.error(result.stderr.trim() || `${agent} exited with code ${result.code}`);
    process.exitCode = result.code || 1;
    return;
  }

  const output = result.output.trim();
  if (!output) {
    console.error(`${agent} returned no output.`);
    process.exitCode = 1;
    return;
  }

  if (options.stdout) {
    console.log(output);
    return;
  }

  const outFile = path.resolve(process.cwd(), options.outFile);
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, `${output}\n`);

  console.log(`Wrote PRD and implementation plan: ${toDisplayPath(path.relative(process.cwd(), outFile))}`);
  console.log("");
  console.log("Next:");
  console.log(`  Review ${toDisplayPath(path.relative(process.cwd(), outFile))}`);
  console.log("  ./scripts/ralphy.sh");
}

async function detectPlanningAgent() {
  if (await hasCommand("codex")) return "codex";
  if (await hasCommand("claude")) return "claude";
  if (await hasCommand("gemini")) return "gemini";
  if (await hasCommand("opencode")) return "opencode";
  return null;
}

async function runAgentCommand(agent, prompt, { model }) {
  if (process.env.LP88_AGENT_COMMAND) {
    return runCustomAgentCommand(process.env.LP88_AGENT_COMMAND, prompt);
  }

  if (agent === "codex") {
    return runCodexPlan(prompt, { model });
  }

  if (agent === "claude") {
    return runCapturedCommand("claude", [
      "--print",
      ...(model ? ["--model", model] : []),
      "--output-format",
      "text",
      "--permission-mode",
      "plan",
      prompt
    ]);
  }

  if (agent === "gemini") {
    return runCapturedCommand("gemini", [
      ...(model ? ["--model", model] : []),
      "--prompt",
      prompt,
      "--approval-mode",
      "plan",
      "--output-format",
      "text"
    ]);
  }

  if (agent === "opencode") {
    return runCapturedCommand("opencode", [
      "run",
      ...(model ? ["--model", model] : []),
      prompt
    ]);
  }

  if (agent === "cursor") {
    return {
      code: 1,
      output: "",
      stderr: "Cursor plan runner is not configured yet. Set LP88_AGENT_COMMAND to the noninteractive Cursor command for your setup."
    };
  }

  return {
    code: 1,
    output: "",
    stderr: `Unsupported planning agent: ${agent}. Supported built-ins: codex, claude, gemini, opencode.`
  };
}

async function runCodexPlan(prompt, { model }) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "lp88-plan-"));
  const outputFile = path.join(tempDir, "plan.md");
  const result = await runCapturedCommand("codex", [
    "exec",
    "--cd",
    process.cwd(),
    "--sandbox",
    "read-only",
    "--output-last-message",
    outputFile,
    ...(model ? ["--model", model] : []),
    prompt
  ]);

  if (result.code !== 0) {
    return result;
  }

  if (existsSync(outputFile)) {
    return {
      ...result,
      output: await readFile(outputFile, "utf8")
    };
  }

  return result;
}

async function runCustomAgentCommand(command, prompt) {
  const parts = command.split(" ").filter(Boolean);
  if (parts.length === 0) {
    return {
      code: 1,
      output: "",
      stderr: "LP88_AGENT_COMMAND is empty."
    };
  }

  const renderedParts = parts.map((part) => part === "{prompt}" ? prompt : part);
  if (!parts.includes("{prompt}")) {
    renderedParts.push(prompt);
  }

  return runCapturedCommand(renderedParts[0], renderedParts.slice(1));
}

async function runCapturedCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      shell: false
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      resolve({
        code: 1,
        output: stdout,
        stderr: error.message
      });
    });
    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        output: stdout,
        stderr
      });
    });
  });
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

  const configuredRalphyEngine = await readRalphyEngineConfig(process.cwd());
  if (configuredRalphyEngine) {
    console.log(`ℹ️ Ralphy engine preference: ${configuredRalphyEngine}`);
  } else {
    console.log("ℹ️ Ralphy engine preference not configured");
  }

  const lp88Config = await readLp88Config(process.cwd());
  if (lp88Config.agent) {
    console.log(`ℹ️ lp88 planning agent: ${lp88Config.agent}${lp88Config.model ? ` (${lp88Config.model})` : ""}`);
  } else {
    console.log("ℹ️ lp88 planning agent not configured");
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

async function offerLp88AgentConfig({ skip, force }) {
  if (skip) {
    return;
  }

  const configFile = path.join(process.cwd(), lp88ConfigFile);
  if (existsSync(configFile) && !force) {
    console.log("");
    console.log(`lp88 planning agent already exists: ${lp88ConfigFile}`);
    return;
  }

  const detected = await detectPlanningAgentOptions();

  if (detected.length === 0) {
    if (process.stdin.isTTY && process.stdout.isTTY) {
      console.log("");
      console.log("No supported lp88 planning agent CLI was detected.");
      console.log(`Install Codex or Gemini, then edit ${lp88ConfigFile}.`);
    }
    return;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log("");
    console.log("Detected lp88 planning agents:");
    for (const engine of detected) {
      console.log(`  ${engine.key}: ${engine.label}`);
    }
    console.log(`To set a default, create ${lp88ConfigFile} with LP88_AGENT=<agent>.`);
    return;
  }

  console.log("");
  console.log("Detected lp88 planning agents:");
  detected.forEach((engine, index) => {
    console.log(`  ${index + 1}. ${engine.label} (${engine.key})`);
  });
  console.log("  0. Do not configure a planning agent");

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const answer = await rl.question("Choose the default lp88 planning agent for this project [0] ");
    const selectedIndex = Number.parseInt(answer.trim() || "0", 10);
    if (!Number.isInteger(selectedIndex) || selectedIndex <= 0 || selectedIndex > detected.length) {
      console.log("Skipped lp88 planning agent preference.");
      return;
    }

    const selected = detected[selectedIndex - 1];
    let model = "";
    const modelAnswer = await rl.question(`Default model for ${selected.key}? Leave blank for CLI default. `);
    model = modelAnswer.trim();

    await writeLp88Config({ agent: selected.key, model }, { force });
  } finally {
    rl.close();
  }
}

async function offerRalphyEngineConfig({ skip, force }) {
  if (skip) {
    return;
  }

  const configFile = path.join(process.cwd(), ralphyConfigFile);
  if (existsSync(configFile) && !force) {
    console.log("");
    console.log(`Ralphy engine preference already exists: ${ralphyConfigFile}`);
    return;
  }

  const detected = await detectAgentCliOptions();

  if (detected.length === 0) {
    if (process.stdin.isTTY && process.stdout.isTTY) {
      console.log("");
      console.log("No Ralphy-compatible AI engine CLI was detected.");
      console.log(`Install Codex, Cursor agent, Claude Code, or another supported CLI, then edit ${ralphyConfigFile}.`);
    }
    return;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log("");
    console.log("Detected Ralphy-compatible AI engines:");
    for (const engine of detected) {
      console.log(`  ${engine.key}: ${engine.label}`);
    }
    console.log(`To set a default, create ${ralphyConfigFile} with RALPHY_ENGINE=<engine>.`);
    return;
  }

  console.log("");
  console.log("Detected Ralphy-compatible AI engines:");
  detected.forEach((engine, index) => {
    console.log(`  ${index + 1}. ${engine.label} (${engine.key})`);
  });
  console.log("  0. Do not configure a Ralphy engine");

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const answer = await rl.question("Choose the default Ralphy engine for this project [0] ");
    const selectedIndex = Number.parseInt(answer.trim() || "0", 10);
    if (!Number.isInteger(selectedIndex) || selectedIndex <= 0 || selectedIndex > detected.length) {
      console.log("Skipped Ralphy engine preference.");
      return;
    }

    await writeRalphyEngineConfig(detected[selectedIndex - 1], { force });
  } finally {
    rl.close();
  }
}

async function detectAgentCliOptions() {
  const detected = [];
  for (const engine of ralphyEngines) {
    if (await hasCommand(engine.command)) {
      detected.push(engine);
    }
  }
  return detected;
}

async function detectPlanningAgentOptions() {
  const detected = [];
  for (const agent of planningAgents) {
    if (await hasCommand(agent.command)) {
      detected.push(agent);
    }
  }
  return detected;
}

async function writeLp88Config({ agent, model }, { force }) {
  const configFile = path.join(process.cwd(), lp88ConfigFile);
  if (existsSync(configFile) && !force) {
    return;
  }

  await mkdir(path.dirname(configFile), { recursive: true });
  await writeFile(configFile, [
    "# lp88 preferences",
    "# Edit this file or override these values in the shell before running lp88 plan --run.",
    `LP88_AGENT="\${LP88_AGENT:-${agent}}"`,
    `LP88_MODEL="\${LP88_MODEL:-${model}}"`,
    ""
  ].join("\n"));
  console.log(`Saved lp88 planning agent: ${agent}${model ? ` (${model})` : ""} (${lp88ConfigFile})`);
}

async function writeRalphyEngineConfig(engine, { force }) {
  const configFile = path.join(process.cwd(), ralphyConfigFile);
  if (existsSync(configFile) && !force) {
    return;
  }

  await mkdir(path.dirname(configFile), { recursive: true });
  await writeFile(configFile, [
    "# lp88 Ralphy preferences",
    "# Edit this file or override these values in the shell before running ./scripts/ralphy.sh.",
    `RALPHY_ENGINE="\${RALPHY_ENGINE:-${engine.key}}"`,
    "RALPHY_MODEL=\"${RALPHY_MODEL:-}\"",
    ""
  ].join("\n"));
  console.log(`Saved Ralphy engine preference: ${engine.key} (${ralphyConfigFile})`);
}

async function readLp88Config(root) {
  const configFile = path.join(root, lp88ConfigFile);
  if (!existsSync(configFile)) {
    return {};
  }

  const config = await readFile(configFile, "utf8");
  return {
    agent: readShellDefault(config, "LP88_AGENT"),
    model: readShellDefault(config, "LP88_MODEL")
  };
}

async function readRalphyEngineConfig(root) {
  const configFile = path.join(root, ralphyConfigFile);
  if (!existsSync(configFile)) {
    return null;
  }

  const config = await readFile(configFile, "utf8");
  return readShellDefault(config, "RALPHY_ENGINE") ?? "configured";
}

function readShellDefault(config, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const defaultMatch = config.match(new RegExp(`${escaped}=["']?\\$\\{${escaped}:-([^}"']*)}`));
  if (defaultMatch) {
    return defaultMatch[1] || null;
  }

  const directMatch = config.match(new RegExp(`${escaped}=["']?([^"'\\n]+)`));
  return directMatch?.[1] ?? null;
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
  console.log("Launchpad-88 installed the agent workflow.");
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

Launchpad-88: bootstrap a Codex/agent workflow into the current project.

Usage:
  lp88 init
  lp88 init --dry-run
  lp88 init --force
  lp88 init --no-optional-installs
  lp88 audit
  lp88 plan "<task>"
  lp88 plan --run "<task>"
  lp88 doctor
  lp88 help
  lp88 --help
  lp88 --version

Commands:
  init       Copy AGENTS.md, Codex prompts, skills, scripts, and CI into this project.
  audit      Run ./scripts/audit.sh.
  plan       Print or run a planning prompt for a task.
  doctor     Check whether the lp88 workflow files are installed.
  help       Show this help text.

Examples:
  npx lp88 init
  lp88 doctor
  lp88 plan "Improve onboarding flow"
  lp88 plan --run --agent codex "Improve onboarding flow"
  lp88 audit`);
}

await main();
