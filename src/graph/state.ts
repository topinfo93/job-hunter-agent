// Shared state that flows through every node of the graph.
// Plain fields are overwritten by each update; `log` uses a reducer (append).
import { StateSchema, ReducedValue, type GraphNode } from "@langchain/langgraph";
import * as z from "zod";
import type { Evaluation, Job, Letter, RankedJob } from "../types.js";

export const JobState = new StateSchema({
  cv: z.string(),
  seen: z.record(z.string(), z.string()).default(() => ({})),
  rawJobs: z.array(z.custom<Job>()).default(() => []),
  candidates: z.array(z.custom<Job>()).default(() => []),
  ranked: z.array(z.custom<RankedJob>()).default(() => []),
  evaluations: z.array(z.custom<Evaluation>()).default(() => []),
  letters: z.array(z.custom<Letter>()).default(() => []),
  report: z.string().default(""),
  log: new ReducedValue(z.array(z.string()).default(() => []), {
    reducer: (current, update) => current.concat(update),
  }),
});

export type Node = GraphNode<typeof JobState>;
export type State = Parameters<Node>[0];
