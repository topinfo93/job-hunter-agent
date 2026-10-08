// Node 7 — build the daily digest, send it to Telegram, save a markdown copy, remember seen jobs.
import fs from "node:fs/promises";
import { config } from "../../config.js";
import { saveSeen } from "../../lib/store.js";
import { sendTelegram } from "../../lib/telegram.js";
import { escapeHtml as h } from "../../lib/utils.js";
import { shortlist } from "./evaluate.js";
import type { Node } from "../state.js";

const SOURCE_NAME = { himalayas: "Himalayas", remotive: "Remotive", remoteok: "RemoteOK" } as const;

export const report: Node = async (state) => {
  const date = new Date().toISOString().slice(0, 10);
  const top = shortlist(state);
  const others = state.evaluations
    .filter((e) => !top.includes(e) && e.fitScore >= 50 && e.locationEligible !== "no")
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 5);
  const job = (id: string) => state.ranked.find((j) => j.id === id)!;

  // ---- Telegram (HTML) ----
  // const tg: string[] = [`<b>🔎 Job digest ${date}</b>\n${state.log.map(h).join("\n")}`];
    const tg: string[] = [
    `<b>🔎 Job digest ${date}</b>\n${state.rawJobs.length} fetched → ${state.candidates.length} filtered → ${state.evaluations.length} judged → <b>${top.length} matches</b>`,
  ];

  if (top.length === 0) tg.push("No strong matches today.");
  for (const e of top) {
    const j = job(e.jobId);
    tg.push(
      `<b>${e.fitScore}/100 · ${h(j.title)}</b>\n${h(j.company)} · ${h(j.location || "location n/a")}${j.salary ? ` · ${h(j.salary)}` : ""}\n` +
        `✅ ${h(e.matchedSkills.join(", ") || "-")}\n⚠️ ${h(e.missingSkills.join(", ") || "-")}\n` +
        `${h(e.summary)}${e.redFlags.length ? `\n🚩 ${h(e.redFlags.join("; "))}` : ""}\n` +
        `<a href="${h(j.url)}">Open on ${SOURCE_NAME[j.source]}</a>`,
    );
  }
  if (others.length) {
    tg.push(
      `<b>Maybe:</b>\n` +
        others.map((e) => `• ${e.fitScore} · <a href="${h(job(e.jobId).url)}">${h(job(e.jobId).title)}</a> — ${h(job(e.jobId).company)}`).join("\n"),
    );
  }
  for (const l of state.letters) {
    const j = job(l.jobId);
    tg.push(`<b>✉️ Draft: ${h(j.title)} @ ${h(j.company)}</b>${l.approved ? "" : " (⚠️ not fully approved)"}\n<pre>${h(l.text)}</pre>`);
  }

  // ---- Markdown copy (output/report-YYYY-MM-DD.md) ----
  const md = [
    `# Job digest ${date}`,
    state.log.map((l) => `- ${l}`).join("\n"),
    ...top.map((e) => {
      const j = job(e.jobId);
      return `## ${e.fitScore}/100 — ${j.title} @ ${j.company}\n- Location: ${j.location || "n/a"}\n- Salary: ${j.salary ?? "n/a"}\n- Matched: ${e.matchedSkills.join(", ")}\n- Missing: ${e.missingSkills.join(", ")}\n- ${e.summary}\n- Link (${SOURCE_NAME[j.source]}): ${j.url}`;
    }),
    ...state.letters.map((l) => `## Cover letter — ${job(l.jobId).title} @ ${job(l.jobId).company}\n\n${l.text}`),
  ].join("\n\n");
  await fs.writeFile(new URL(`../../../output/report-${date}.md`, import.meta.url), md);

  const message = tg.join("\n\n");
  if (config.dryRun) console.log(md);
  else await sendTelegram(message);

  // dry runs don't mark jobs as seen, so you can re-run while tuning prompts/filters
  if (!config.dryRun) await saveSeen({ ...state.seen }, state.candidates.map((j) => j.id));
  return { report: md, log: [`report: ${config.dryRun ? "printed (dry run)" : "sent to Telegram"}`] };
};
