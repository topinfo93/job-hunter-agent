// We Work Remotely RSS: https://weworkremotely.com/remote-job-rss-feed
// Terms: attribute and link back to We Work Remotely.
import type { Job } from "../types.js";
import { sleep, stripHtml, toIsoDate } from "../lib/utils.js";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Text of every <tag>…</tag> in `xml`; CDATA is unwrapped, otherwise entities are decoded. */
function tagValues(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi");
  return [...xml.matchAll(re)].map(([, raw]) => {
    const cdata = raw.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
    return (cdata ? cdata[1] : decodeEntities(raw)).trim();
  });
}

const tagValue = (xml: string, tag: string) => tagValues(xml, tag)[0] ?? "";

function parseItem(item: string): Job | null {
  const rawTitle = tagValue(item, "title");
  const link = tagValue(item, "link") || tagValue(item, "guid");
  if (!rawTitle || !link) return null;
  const colon = rawTitle.indexOf(":");
  const [company, title] =
    colon > 0 ? [rawTitle.slice(0, colon).trim(), rawTitle.slice(colon + 1).trim()] : ["", rawTitle];
  return {
    id: `weworkremotely:${link}`,
    source: "weworkremotely",
    title,
    company,
    url: link,
    location: tagValue(item, "region"),
    tags: [...tagValues(item, "category"), ...tagValues(item, "type")].filter(Boolean),
    description: stripHtml(tagValue(item, "description")),
    postedAt: toIsoDate(tagValue(item, "pubDate")),
  };
}

export async function fetchWeWorkRemotely(categories: string[]): Promise<Job[]> {
  const out: Job[] = [];
  for (const [i, category] of categories.entries()) {
    if (i > 0) await sleep(1000);
    const url = `https://weworkremotely.com/categories/${encodeURIComponent(category)}.rss`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "job-hunter-agent (personal use)", Accept: "application/rss+xml, application/xml" },
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
      const xml = await res.text();
      for (const [, item] of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
        const job = parseItem(item);
        if (job) out.push(job);
      }
    } catch (e) {
      console.warn(`[weworkremotely] "${category}" failed:`, (e as Error).message);
    }
  }
  return out;
}
