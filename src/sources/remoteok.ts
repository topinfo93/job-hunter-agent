// RemoteOK public API: https://remoteok.com/api
// Returns the whole board as an array; element 0 is a legal notice (skip it). Attribution/link back required.
import type { Job } from "../types.js";
import { fetchJson, stripHtml, toIsoDate } from "../lib/utils.js";

type RemoteOKJob = {
  id?: string | number;
  position?: string;
  company?: string;
  url?: string;
  apply_url?: string;
  location?: string;
  tags?: string[];
  description?: string;
  date?: string;
  epoch?: number;
  salary_min?: number;
  salary_max?: number;
};

export async function fetchRemoteOK(): Promise<Job[]> {
  try {
    const data = await fetchJson<RemoteOKJob[]>("https://remoteok.com/api");
    return data
      .filter((j) => j && j.id && j.position) // drops the legal-notice element
      .map((j) => ({
        id: `remoteok:${j.id}`,
        source: "remoteok" as const,
        title: j.position!,
        company: j.company ?? "",
        url: j.url ?? `https://remoteok.com/remote-jobs/${j.id}`,
        location: j.location ?? "",
        tags: j.tags ?? [],
        description: stripHtml(j.description),
        salary: j.salary_min || j.salary_max ? `$${j.salary_min ?? "?"}–$${j.salary_max ?? "?"}/year` : undefined,
        postedAt: toIsoDate(j.date ?? j.epoch),
      }));
  } catch (e) {
    console.warn("[remoteok] failed:", (e as Error).message);
    return [];
  }
}
