// Node 4 — LLM judge: reads each job + CV and returns a structured evaluation (zod schema).
import * as z from "zod";
import { config } from "../../config.js";
import { judgeModel } from "../../lib/llm.js";
import { sleep } from "../../lib/utils.js";
import type { Evaluation } from "../../types.js";
import type { Node, State } from "../state.js";

const EvalSchema = z.object({
  fitScore: z.number().describe("0-100: how well the candidate fits the role's real requirements"),
  locationEligible: z
    .enum(["yes", "no", "unclear"])
    .describe("Can a person living in Vietnam (UTC+7) be hired? 'no' if restricted to other countries/regions"),
  matchedSkills: z.array(z.string()).describe("Required skills the candidate clearly has"),
  missingSkills: z.array(z.string()).describe("Important required skills the candidate lacks"),
  summary: z.string().describe("One or two sentences, plain English, why it is or isn't a fit"),
  redFlags: z.array(z.string()).describe("e.g. very senior/lead only, unpaid, vague scam signs, onsite required"),
});

const judge = judgeModel.withStructuredOutput(EvalSchema);

const SYSTEM = `You are a strict technical recruiter screening remote jobs for ONE candidate.
Scoring rules:
- 85+ only if the core stack AND seniority clearly match. Below 50 if the main stack differs.
- Candidate's English is B1: subtract 10-15 if the job requires fluent/native English or heavy client-facing communication.
- Subtract 10 if it requires daily overlap with US/EU hours that is hard from UTC+7.
- Subtract 10 for each core required skill that is missing (e.g. TypeScript, Node.js, Laravel) if central to the role.
- AI-training / data-annotation / "create coding challenges" gigs are NOT developer jobs: score <= 50 and add a red flag.
Judge location strictly from the job text. Never assume facts not in the job or CV.`;

export const evaluateJobs: Node = async (state) => {
  const evaluations: Evaluation[] = [];
  for (const job of state.ranked) {
    try {
      const r = await judge.invoke([
        ["system", SYSTEM],
        [
          "human",
          `CANDIDATE CV:\n${state.cv}\n\nJOB:\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location || "not stated"}\nTags: ${job.tags.join(", ")}\nSalary: ${job.salary ?? "not stated"}\n\n${job.description.slice(0, 6000)}`,
        ],
      ]);
      evaluations.push({ jobId: job.id, ...r, fitScore: Math.max(0, Math.min(100, Math.round(r.fitScore))) });
    } catch (e) {
      console.warn(`[evaluate] ${job.title} failed:`, (e as Error).message);
    }
    await sleep(config.evalDelayMs);
  }
  const shortlisted = shortlist({ ...state, evaluations });
  return { evaluations, log: [`evaluate: ${evaluations.length} judged, ${shortlisted.length} shortlisted`] };
};

export function shortlist(state: Pick<State, "evaluations">): Evaluation[] {
  return state.evaluations
    .filter((e) => e.fitScore >= config.shortlistScore && e.locationEligible !== "no")
    .sort((a, b) => b.fitScore - a.fitScore);
}

// Conditional edge: only write cover letters when something is worth applying to.
export function routeAfterEvaluate(state: State): "draftLetters" | "sendReport" {
  return shortlist(state).length > 0 ? "draftLetters" : "sendReport";
}
