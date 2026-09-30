import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const rootPath = fileURLToPath(root);
const excluded = new Set([".git", ".next", "node_modules", "coverage", ".venv", "__pycache__", ".pytest_cache"]);
const textExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".py", ".yaml", ".yml", ".toml", ".txt", ".example", ".gitignore"]);
const files = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else files.push(full);
  }
}
await walk(rootPath);

const packageJson = JSON.parse(await readFile(join(rootPath, "package.json"), "utf8"));
const deployment = JSON.parse(await readFile(join(rootPath, "deployments/studionet.json"), "utf8"));
const network = await readFile(join(rootPath, "lib/network.ts"), "utf8");
const envExample = await readFile(join(rootPath, ".env.example"), "utf8");
const errors = [];

if (packageJson.devDependencies?.genlayer !== "0.39.1") errors.push("local GenLayer CLI is not pinned to 0.39.1");
if (deployment.network !== "studionet" || deployment.chainId !== 61999) errors.push("deployment manifest network mismatch");
if (deployment.rpc !== "https://studio.genlayer.com/api") errors.push("deployment manifest RPC mismatch");
if (!network.includes("chainId: 61999") || !network.includes("https://studio.genlayer.com/api")) errors.push("frontend network configuration mismatch");
if (!envExample.includes("NEXT_PUBLIC_FIXPOINT_CONTRACT_ADDRESS=")) errors.push("frontend contract environment example missing");

const secretPatterns = [
  /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/,
  /(?:private[_ -]?key|seed[_ -]?phrase|mnemonic)\s*[:=]\s*["']?[A-Za-z0-9+/=_ -]{24,}/i,
];
for (const file of files) {
  const name = relative(rootPath, file);
  const ext = name === ".env.example" || name === ".gitignore" ? name : name.slice(name.lastIndexOf("."));
  if (!textExtensions.has(ext)) continue;
  let content;
  try { content = await readFile(file, "utf8"); } catch { continue; }
  for (const pattern of secretPatterns) {
    if (pattern.test(content)) errors.push(`possible secret material in ${name}`);
  }
  if ((name.startsWith("app/") || name.startsWith("components/") || name.startsWith("lib/") || name.startsWith("deployments/")) && /https?:\/\/(?:localhost|127\.0\.0\.1)/i.test(content)) {
    errors.push(`local endpoint present in application path: ${name}`);
  }
}

if (errors.length) {
  console.error(errors.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log(`repository audit passed across ${files.length} files`);
