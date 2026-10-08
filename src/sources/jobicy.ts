// Jobicy public API: https://jobi.cy/apidocs
// Terms: poll at most once per hour, credit Jobicy and keep the Jobicy job URL as the link.
import type { Job } from "../types.js";
import { fetchJson, sleep, stripHtml, toIsoDate } from "../lib/utils.js";

type StrOrArr = string | string[];

type JobicyJob = {
  id: number | string;
  url?: string;
  jobTitle?: string;
  companyName?: string;
  jobGeo?: StrOrArr;
  jobIndustry?: StrOrArr;
  jobType?: StrOrArr;
  jobLevel?: StrOrArr;
  jobDescription?: string;
  jobExcerpt?: string;
  pubDate?: string;
  salaryMin?: number | string;
  salaryMax?: number | string;
  salaryCurrency?: string;
  salaryPeriod?: string;
};

/** Fields may be a string ("APAC,  EMEA"), an array, or missing. */
const toList = (v?: StrOrArr): string[] =>
  (Array.isArray(v) ? v : (v ?? "").split(",")).map((s) => String(s).trim()).filter(Boolean);

export async function fetchJobicy(geos: string[]): Promise<Job[]> {
  const out: Job[] = [];
  for (const [i, geo] of geos.entries()) {
    if (i > 0) await sleep(1500);
    const url = `https://jobicy.com/api/v2/remote-jobs?count=100&geo=${encodeURIComponent(geo)}&industry=engineering`;
    try {
      const data = await fetchJson<{ jobs?: JobicyJob[] }>(url);
      for (const j of data.jobs ?? []) {
        if (!j?.id || !j.jobTitle) continue;
        out.push({
          id: `jobicy:${j.id}`,
          source: "jobicy",
          title: j.jobTitle,
          company: j.companyName ?? "",
          url: j.url ?? `https://jobicy.com/jobs/${j.id}`,
          location: toList(j.jobGeo).join(", "),
          tags: [...toList(j.jobIndustry), ...toList(j.jobType), ...toList(j.jobLevel)],
          description: stripHtml(j.jobDescription ?? j.jobExcerpt ?? ""),
          salary:
            j.salaryMin || j.salaryMax
              ? `${j.salaryMin ?? "?"}–${j.salaryMax ?? "?"} ${j.salaryCurrency ?? ""}/${j.salaryPeriod ?? "year"}`
              : undefined,
          postedAt: toIsoDate(j.pubDate),
        });
      }
    } catch (e) {
      console.warn(`[jobicy] geo="${geo}" failed:`, (e as Error).message);
    }
  }
  return out;
}
