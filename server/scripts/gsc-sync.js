// Usage: npm run gsc:sync   (the server also does this once a day when Search Console is configured)
import { config } from "./_env.js";
import { createDb } from "../src/db.js";
import { syncSearchStats } from "../src/gsc.js";

const db = await createDb(config.db);
try {
  const rows = await syncSearchStats({ config, db });
  console.log(`Saved ${rows} days of Search Console data.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
