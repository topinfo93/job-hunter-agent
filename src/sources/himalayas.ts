// Himalayas public API: https://himalayas.app/api
// Search endpoint, max 20 results/request, link back to Himalayas required.
import type { Job } from "../types.js";
import { fetchJson, sleep, stripHtml, toIsoDate } from "../lib/utils.js";

type HimalayasJob = {
  title: string;
  excerpt?: string;
  description?: string;
  companyName: string;
  employmentType?: string;
  locationRestrictions?: string[];
  timezoneRestriction?: (string | number)[];
  category?: string[];
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  salaryPeriod?: string;
  pubDate?: string | number;
  applicationLink?: string;
  guid?: string;
};

export async function fetchHimalayas(queries: string[]): Promise<Job[]> {
  const out: Job[] = [];
  for (const q of queries) {
    const url = `https://himalayas.app/jobs/api/search?q=${encodeURIComponent(q)}&country=Vietnam&sort=recent&page=1`;
    try {
      const data = await fetchJson<{ jobs?: HimalayasJob[] }>(url);
      for (const j of data.jobs ?? []) {
        const link = j.guid?.startsWith("http") ? j.guid : j.applicationLink ?? "";
        out.push({
          id: `himalayas:${link || `${j.companyName}-${j.title}`}`,
          source: "himalayas",
          title: j.title,
          company: j.companyName,
          url: link,
          location: j.locationRestrictions?.length ? j.locationRestrictions.join(", ") : "Worldwide",
          tags: [...(j.category ?? []), j.employmentType ?? ""].filter(Boolean),
          description: stripHtml(j.description ?? j.excerpt ?? ""),
          salary:
            j.minSalary || j.maxSalary
              ? `${j.minSalary ?? "?"}–${j.maxSalary ?? "?"} ${j.currency ?? ""}/${j.salaryPeriod ?? "year"}`
              : undefined,
          postedAt: toIsoDate(j.pubDate),
        });
      }
    } catch (e) {
      console.warn(`[himalayas] "${q}" failed:`, (e as Error).message);
    }
    await sleep(1500); // be gentle, API is rate limited
  }
  return out;
}
