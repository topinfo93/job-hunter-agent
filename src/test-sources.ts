import { fetchAllJobs } from "./sources/index.js";

const jobs = await fetchAllJobs();
console.table(
  jobs.slice(0, 10).map((j) => ({ source: j.source, title: j.title.slice(0, 50), company: j.company, location: j.location })),
);