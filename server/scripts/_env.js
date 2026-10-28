import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config.js";

const here = dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(join(here, "../.env"));
} catch {
  /* no .env file: use the real environment */
}

export const config = loadConfig();
export const schemaFile = join(here, "../sql/schema.sql");
