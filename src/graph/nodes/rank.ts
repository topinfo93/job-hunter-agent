// Node 3 — semantic ranking: embed CV + each job, keep the top-K most similar.
// This is the "R" of RAG reused for matching; it keeps LLM calls (the expensive part) small.
import { config } from "../../config.js";
import { embedDocuments, embedQuery } from "../../lib/embeddings.js";
import { cosine } from "../../lib/utils.js";
import type { Node } from "../state.js";

export const rankJobs: Node = async (state) => {
  if (state.candidates.length === 0) return { ranked: [], log: ["rank: nothing to rank"] };

  const cvVector = await embedQuery(state.cv);
  const jobVectors = await embedDocuments(
    state.candidates.map((j) => ({
      title: `${j.title} at ${j.company}`,
      text: `${j.tags.join(", ")}\n${j.description.slice(0, 1500)}`,
    })),
  );

  const ranked = state.candidates
    .map((j, i) => ({ ...j, similarity: cosine(cvVector, jobVectors[i]) }))
    .filter((j) => j.similarity >= config.minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, config.topK);

  return {
    ranked,
    log: [`rank: top ${ranked.length} (best ${ranked[0]?.similarity.toFixed(2) ?? "-"})`],
  };
};
