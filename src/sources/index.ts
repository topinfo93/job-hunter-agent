import { config } from "../config.js";
import type { Job } from "../types.js";
import { fetchHimalayas } from "./himalayas.js";
import { fetchRemotive } from "./remotive.js";
import { fetchRemoteOK } from "./remoteok.js";
import { fetchJobicy } from "./jobicy.js";
import { fetchWeWorkRemotely } from "./weworkremotely.js";

export async function fetchAllJobs(): Promise<Job[]> {
  const [himalayas, remotive, remoteok, jobicy, weworkremotely] = await Promise.all([
    fetchHimalayas(config.himalayasQueries),
    config.remotiveCategory ? fetchRemotive(config.remotiveCategory) : Promise.resolve([]),
    config.useRemoteOK ? fetchRemoteOK() : Promise.resolve([]),
    fetchJobicy(config.jobicyGeos),
    fetchWeWorkRemotely(config.wwrCategories),
  ]);
  const all = [...himalayas, ...remotive, ...remoteok, ...jobicy, ...weworkremotely];
  console.log(
    `[fetch] himalayas=${himalayas.length} remotive=${remotive.length} remoteok=${remoteok.length} ` +
      `jobicy=${jobicy.length} weworkremotely=${weworkremotely.length} total=${all.length}`,
  );
  return all;
}
