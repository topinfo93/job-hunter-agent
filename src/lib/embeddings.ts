// Gemini embeddings (free tier) via the official @google/genai SDK.
// gemini-embedding-2 uses text prefixes instead of task_type:
//   query:    "task: search result | query: ..."
//   document: "title: ... | text: ..."
import { GoogleGenAI } from "@google/genai";
import { sleep } from "./utils.js";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
const MODEL = "gemini-embedding-2";
const DIM = 768;
const BATCH = 20;

async function embedMany(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    // One Content object per text => one embedding per text (not an aggregated one)
    const res = await ai.models.embedContent({
      model: MODEL,
      contents: batch.map((t) => ({ parts: [{ text: t }] })),
      config: { outputDimensionality: DIM },
    });
    for (const e of res.embeddings ?? []) vectors.push(e.values ?? []);
    if (i + BATCH < texts.length) await sleep(1000);
  }
  return vectors;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [v] = await embedMany([`task: search result | query: ${text}`]);
  return v;
}

export async function embedDocuments(docs: { title: string; text: string }[]): Promise<number[][]> {
  return embedMany(docs.map((d) => `title: ${d.title} | text: ${d.text}`));
}
