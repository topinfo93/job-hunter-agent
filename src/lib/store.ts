// Remembers which jobs were already processed so you never get the same job twice.
// Stored as data/seen.json and committed back to the repo by GitHub Actions.
import fs from "node:fs/promises";

const FILE = new URL("../../data/seen.json", import.meta.url);
const KEEP_DAYS = 60;

export async function loadSeen(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return {};
  }
}

export async function saveSeen(seen: Record<string, string>, newIds: string[]) {
  const today = new Date().toISOString().slice(0, 10);
  for (const id of newIds) seen[id] ??= today;
  const cutoff = Date.now() - KEEP_DAYS * 86_400_000;
  for (const [id, d] of Object.entries(seen)) if (new Date(d).getTime() < cutoff) delete seen[id];
  await fs.writeFile(FILE, JSON.stringify(seen, null, 2));
}
