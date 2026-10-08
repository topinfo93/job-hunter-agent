// Remotive public API: https://github.com/remotive-com/remote-jobs-api
// Terms: max ~4 fetches/day, <= 2 requests/min, link back to Remotive, jobs are delayed 24h.
import type { Job } from "../types.js";
import { fetchJson, stripHtml, toIsoDate } from "../lib/utils.js";

type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category?: string;
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
  tags?: string[];
};

export async function fetchRemotive(category: string): Promise<Job[]> {
  const url = `https://remotive.com/api/remote-jobs?category=${encodeURIComponent(category)}&limit=150`;
  try {
    const data = await fetchJson<{ jobs?: RemotiveJob[] }>(url);
    return (data.jobs ?? []).map((j) => ({
      id: `remotive:${j.id}`,
      source: "remotive" as const,
      title: j.title,
      company: j.company_name,
      url: j.url,
      location: j.candidate_required_location ?? "",
      tags: [...(j.tags ?? []), j.job_type ?? ""].filter(Boolean),
      description: stripHtml(j.description),
      salary: j.salary || undefined,
      postedAt: toIsoDate(j.publication_date),
    }));
  } catch (e) {
    console.warn("[remotive] failed:", (e as Error).message);
    return [];
  }
}
