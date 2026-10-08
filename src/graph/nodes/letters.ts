// Nodes 5 & 6 — draft cover letters, then a reviewer checks them.
// draft -> review -> (redraft with feedback) is a CYCLE in the graph: the part that makes this an agent,
// not just a pipeline. The loop stops when every letter is approved or maxRevisions is reached.
import * as z from "zod";
import type { BaseMessage } from "@langchain/core/messages";
import { config } from "../../config.js";
import { reviewerModel, writerModel } from "../../lib/llm.js";
import { sleep } from "../../lib/utils.js";
import type { Letter } from "../../types.js";
import { shortlist } from "./evaluate.js";
import type { Node, State } from "../state.js";

const MAX_ATTEMPTS = 1 + config.maxRevisions;

const text = (m: BaseMessage) =>
  typeof m.content === "string"
    ? m.content
    : m.content.map((p) => ("text" in p && typeof p.text === "string" ? p.text : "")).join("");

const findJob = (state: State, id: string) => state.ranked.find((j) => j.id === id)!;

export const draftLetters: Node = async (state) => {
  // First pass: create empty letters for the best shortlisted jobs (max 1 per company)
  const letters: Letter[] =
    state.letters.length > 0
      ? state.letters.map((l) => ({ ...l }))
      : shortlist(state)
          .filter((e, i, arr) => {
            const company = findJob(state, e.jobId).company;
            return arr.findIndex((x) => findJob(state, x.jobId).company === company) === i;
          })
          .slice(0, config.maxLetters)
          .map((e) => ({ jobId: e.jobId, text: "", approved: false, attempts: 0, reviewedAt: 0, feedback: [] }));

  for (const letter of letters) {
    if (letter.approved || letter.attempts >= MAX_ATTEMPTS) continue;
    const job = findJob(state, letter.jobId);
    const evaluation = state.evaluations.find((e) => e.jobId === letter.jobId)!;
    const fix = letter.feedback.length
      ? `\n\nYOUR PREVIOUS DRAFT:\n${letter.text}\n\nREVIEWER FEEDBACK TO FIX:\n- ${letter.feedback.join("\n- ")}`
      : "";

    const res = await writerModel.invoke([
      [
        "system",
        `You write short, specific cover letters in plain professional English.
Rules: 150-220 words. Use ONLY facts from the CV — never invent numbers, clients, tools, metrics or years.
Do not inflate: avoid "deep expertise", "strong experience", "expert" unless a concrete CV item backs it.
Mention the company and role, 2-3 matched skills with one concrete past project, and remote/timezone readiness (UTC+7).
No clichés ("I am writing to express my interest", "passionate", "dynamic", "ready to contribute immediately").
End with "Best regards, Tran Nhat Quang" and the portfolio link. Output only the letter.`,
      ],
      [
        "human",
        `CV:\n${state.cv}\n\nJOB: ${job.title} at ${job.company}\nMatched skills: ${evaluation.matchedSkills.join(", ")}\n\n${job.description.slice(0, 4000)}${fix}`,
      ],
    ]);
    letter.text = text(res).trim();
    letter.attempts += 1;
    await sleep(config.evalDelayMs);
  }
  return { letters, log: [`draft: ${letters.filter((l) => !l.approved).length} letter(s) written`] };
};

const ReviewSchema = z.object({
  approved: z.boolean().describe("true only if the letter has zero issues"),
  issues: z.array(z.string()).describe("Concrete, fixable problems, quoting the exact phrase. Empty if approved"),
});
const reviewer = reviewerModel.withStructuredOutput(ReviewSchema);

export const reviewLetters: Node = async (state) => {
  const letters = state.letters.map((l) => ({ ...l }));
  for (const letter of letters) {
    if (letter.approved || letter.reviewedAt >= letter.attempts) continue;
    const job = findJob(state, letter.jobId);
    const r = await reviewer.invoke([
      [
        "system",
        `You are a strict fact-checker for a cover letter. Go claim by claim:
1. Every skill, tool, metric, responsibility and adjective-backed claim must appear in the CV. Anything not in the CV
   (e.g. "Core Web Vitals", "high-traffic", "architecting complex back-end systems") => reject and quote it in issues.
2. Reject inflated wording not backed by a concrete CV item: "deep expertise", "strong experience", "expert",
   "I match all your requirements".
3. Reject clichés: "ready to contribute immediately", "clean, maintainable", "passionate", "dynamic".
4. Must name the company and role, be 150-220 words, end with "Best regards, Tran Nhat Quang" and the portfolio link.
Approve only if there are zero issues.`,
      ],
      ["human", `CV:\n${state.cv}\n\nJOB: ${job.title} at ${job.company}\n\nLETTER:\n${letter.text}`],
    ]);
    letter.approved = r.approved;
    letter.feedback = r.issues;
    letter.reviewedAt = letter.attempts;
    await sleep(config.evalDelayMs);
  }
  const approved = letters.filter((l) => l.approved).length;
  return { letters, log: [`review: ${approved}/${letters.length} approved`] };
};

// Conditional edge: loop back to drafting while something can still be fixed.
export function routeAfterReview(state: State): "draftLetters" | "sendReport" {
  const needsWork = state.letters.some((l) => !l.approved && l.attempts < MAX_ATTEMPTS);
  return needsWork ? "draftLetters" : "sendReport";
}