import { config } from "../config.js";
import type { Job } from "../types.js";
import { fetchHimalayas } from "./himalayas.js";
import { fetchRemotive } from "./remotive.js";
import { fetchRemoteOK } from "./remoteok.js";

export async function fetchAllJobs(): Promise<Job[]> {
  const results = await Promise.all([
    fetchHimalayas(config.himalayasQueries),
    config.remotiveCategory ? fetchRemotive(config.remotiveCategory) : Promise.resolve([]),
    config.useRemoteOK ? fetchRemoteOK() : Promise.resolve([]),
  ]);
  const all = results.flat();
  console.log(
    `[fetch] himalayas=${results[0].length} remotive=${results[1].length} remoteok=${results[2].length} total=${all.length}`,
  );
  return all;
}