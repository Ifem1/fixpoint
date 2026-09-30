import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../deployments/studionet.json", import.meta.url), "utf8"));
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(manifest.network === "studionet", "deployment network must be studionet");
expect(manifest.chainId === 61999, "deployment chainId must be 61999");
expect(manifest.rpc === "https://studio.genlayer.com/api", "deployment RPC is unexpected");
expect(/^0x[0-9a-fA-F]{40}$/.test(manifest.address ?? ""), "deployment address is missing or malformed");
expect(/^0x[0-9a-fA-F]{64}$/.test(manifest.deploymentTransaction ?? ""), "deployment transaction is missing or malformed");
expect(/^[0-9a-f]{40}$/.test(manifest.sourceCommit ?? ""), "sourceCommit must be the exact 40-character Git commit deployed");
expect(/^[0-9a-f]{64}$/.test(manifest.sourceSha256 ?? ""), "sourceSha256 is missing or malformed");

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log("deployment manifest is structurally complete");
