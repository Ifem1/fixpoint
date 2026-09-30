import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../contracts/fixpoint.py", import.meta.url));
const digest = createHash("sha256").update(source).digest("hex");
process.stdout.write(`${digest}\n`);
