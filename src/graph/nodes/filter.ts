// Node 2 — cheap rule-based filtering (no API calls). Removes most noise before we spend tokens.
import { config } from "../../config.js";
import type { Job } from "../../types.js";
import { daysAgo } from "../../lib/utils.js";
import type { Node } from "../state.js";

const ALLOWED = /(worldwide|anywhere|global|asia|apac|vietnam|viet nam|southeast|utc\s?\+\s?7|gmt\s?\+\s?7)/i;
const BLOCKED =
  /(us only|usa|united states|u\.s\.|canada|uk only|united kingdom|europe|\beu\b|emea|latam|latin america|americas|north america|australia only|germany|france|spain|brazil|mexico|india only|philippines only)/i;

/** true = keep (allowed or unclear); false = clearly restricted to other regions */
export function locationLooksOk(location: string): boolean {
  if (!location.trim()) return true;
  if (ALLOWED.test(location)) return true;
  return !BLOCKED.test(location);
}

export function matchesKeywords(job: Job): boolean {
  const title = job.title.toLowerCase();
  if (config.excludeTitleKeywords.some((k) => title.includes(k))) return false;
  const haystack = `${job.title} ${job.tags.join(" ")} ${job.description.slice(0, 3000)}`.toLowerCase();
  return config.includeKeywords.some((k) => haystack.includes(k));
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export const filterJobs: Node = async (state) => {
  const byKey = new Map<string, Job>();
  for (const j of state.rawJobs) {
    const key = `${norm(j.company)}|${norm(j.title)}`; // same job posted on 2 boards => keep one
    if (!byKey.has(key)) byKey.set(key, j);
  }

  const stats = { duplicate: state.rawJobs.length - byKey.size, seen: 0, old: 0, keyword: 0, location: 0 };
  const candidates = [...byKey.values()].filter((j) => {
    if (state.seen[j.id]) return (stats.seen++, false);
    if (daysAgo(j.postedAt) > config.maxAgeDays) return (stats.old++, false);
    if (!matchesKeywords(j)) return (stats.keyword++, false);
    if (!locationLooksOk(j.location)) return (stats.location++, false);
    return true;
  });

  return {
    candidates,
    log: [`filter: ${candidates.length} kept (removed ${JSON.stringify(stats)})`],
  };
};
