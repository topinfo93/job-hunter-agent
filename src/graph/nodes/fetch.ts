// Node 1 — collect jobs from all free sources.
import { fetchAllJobs } from "../../sources/index.js";
import type { Node } from "../state.js";

export const fetchJobs: Node = async () => {
  const rawJobs = await fetchAllJobs();
  return { rawJobs, log: [`fetch: ${rawJobs.length} jobs`] };
};
