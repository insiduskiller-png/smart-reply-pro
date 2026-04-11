/**
 * Loads .env.local from the project root into process.env before any evaluation
 * script calls getOpenAiEnv() or generateReply(). Must be the first import in
 * every evaluation entrypoint (run.ts, compare.ts).
 */
import { config } from "dotenv";
import path from "node:path";

config({
  // Resolve relative to wherever tsx is invoked (project root via npm scripts)
  path: path.resolve(process.cwd(), ".env.local"),
  // Don't overwrite values that were already set in the shell environment
  override: false,
});
