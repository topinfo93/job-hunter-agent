import fs from "node:fs/promises";
import { graph } from "./graph/build.js";
import { loadSeen } from "./lib/store.js";

if (!process.env.GOOGLE_API_KEY) {
  console.error("Missing GOOGLE_API_KEY (see .env.example)");
  process.exit(1);
}

const cv = await fs.readFile(new URL("../profile/cv.md", import.meta.url), "utf8");
const seen = await loadSeen();
const started = Date.now();
const t = () => `${((Date.now() - started) / 1000).toFixed(0)}s`;

// stream "updates": each time a node finishes, print its log lines
const stream = await graph.stream({ cv, seen }, { recursionLimit: 40, streamMode: "updates" });
for await (const chunk of stream) {
  for (const [node, update] of Object.entries(chunk as Record<string, { log?: string[] }>)) {
    for (const line of update?.log ?? []) console.log(`[${t()}] ${node} → ${line}`);
  }
}
console.log(`done in ${t()}`);