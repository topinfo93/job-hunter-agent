import { fetchAllJobs } from "./sources/index.js";

const jobs = await fetchAllJobs();
const sources = [...new Set(jobs.map((j) => j.source))];
console.table(
  sources.flatMap((s) => jobs.filter((j) => j.source === s).slice(0, 3)).map((j) => ({
    source: j.source,
    title: j.title.slice(0, 40),
    company: j.company.slice(0, 20),
    location: j.location.slice(0, 30),
    postedAt: j.postedAt?.slice(0, 10),
    url: j.url.slice(0, 70),
  })),
);
