// Wire the nodes into a LangGraph StateGraph.
//
//  START → fetch → filter → rank → evaluate ─┬─(shortlist empty)──────────────→ sendReport → END
//                                            └─(has matches)→ draftLetters → reviewLetters ─┬─(all ok / max tries)→ sendReport
//                                                                  ↑──────────(needs fixes)─┘
import { END, START, StateGraph } from "@langchain/langgraph";
import { JobState } from "./state.js";
import { fetchJobs } from "./nodes/fetch.js";
import { filterJobs } from "./nodes/filter.js";
import { rankJobs } from "./nodes/rank.js";
import { evaluateJobs, routeAfterEvaluate } from "./nodes/evaluate.js";
import { draftLetters, reviewLetters, routeAfterReview } from "./nodes/letters.js";
import { report } from "./nodes/report.js";

export const graph = new StateGraph(JobState)
  .addNode("fetch", fetchJobs)
  .addNode("filter", filterJobs)
  .addNode("rank", rankJobs)
  .addNode("evaluate", evaluateJobs)
  .addNode("draftLetters", draftLetters)
  .addNode("reviewLetters", reviewLetters)
  .addNode("sendReport", report)
  .addEdge(START, "fetch")
  .addEdge("fetch", "filter")
  .addEdge("filter", "rank")
  .addEdge("rank", "evaluate")
  .addConditionalEdges("evaluate", routeAfterEvaluate, ["draftLetters", "sendReport"])
  .addEdge("draftLetters", "reviewLetters")
  .addConditionalEdges("reviewLetters", routeAfterReview, ["draftLetters", "sendReport"])
  .addEdge("sendReport", END)
  .compile();
