// All tunable settings in one place. Edit these first when results look off.
export const config = {
  // --- Sources ---
  himalayasQueries: ["wordpress", "next.js", "php"], // 1 request each, country=Vietnam (includes worldwide)
  //remotiveCategory: "",                  // 1 request per run (Remotive: max ~4 runs/day)
  remotiveCategory: "software-dev",
  useRemoteOK: true,

  // --- Rule-based filter (cheap, no API calls) ---
  maxAgeDays: 14,
  includeKeywords: [
    "wordpress", "woocommerce", "php", "laravel", "next.js", "nextjs", "react",
    "headless", "strapi", "payload", "full stack", "fullstack", "full-stack",
    "frontend", "front-end", "web developer", "n8n", "automation", "llm", "rag",
  ],
  excludeTitleKeywords: [
    "intern", "ios", "android", "flutter", "java ", "golang", "rust", "c++", ".net",
    "data scientist", "data engineer", "machine learning engineer", "sales", "designer",
    "director", "head of", "recruiter", "marketing manager", "support specialist",
  ],

  // --- Embedding ranking ---
  topK: 12,          // how many jobs go to the LLM judge (main cost control)
  minSimilarity: 0.35,

  // --- LLM judge ---
  evalModel: process.env.EVAL_MODEL ?? "gemini-3.5-flash-lite",
  shortlistScore: 75, // fitScore >= this AND location not "no" => shortlist
  evalDelayMs: 4500,  // pause between LLM calls to respect free-tier RPM

  // --- Cover letters ---
  writerModel: process.env.WRITER_MODEL ?? "gemini-3.8-flash",
  maxLetters: 3,
  maxRevisions: 2,    // draft -> review -> redraft loop limit

  // --- Output ---
 // dryRun: process.env.DRY_RUN === "1",
    dryRun: process.env.DRY_RUN === "1" || process.argv.includes("--dry"),
};
