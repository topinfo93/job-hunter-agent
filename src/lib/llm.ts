// LangChain chat models backed by Gemini (AI Studio key via GOOGLE_API_KEY).
import { ChatGoogle } from "@langchain/google/node";
import { config } from "../config.js";

export const judgeModel = new ChatGoogle({
  model: config.evalModel,
  temperature: 0,
  maxRetries: 6,
});

export const writerModel = new ChatGoogle({
  model: config.writerModel,
  temperature: 0,
  maxRetries: 6,
});


export const reviewerModel = new ChatGoogle({
  model: config.writerModel,
  temperature: 0,
  maxRetries: 3,
});