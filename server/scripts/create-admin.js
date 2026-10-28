// Usage: npm run create-admin -- <username>
// Asks for the password (hidden), stores only its scrypt hash. Run again with the same username to reset the password.
import { createInterface } from "node:readline";
import { config } from "./_env.js";
import { createDb } from "../src/db.js";
import { hashPassword } from "../src/auth.js";
import { toSqlDateTime } from "../src/time.js";

const username = (process.argv[2] || "").trim().toLowerCase();
if (!/^[a-z0-9._-]{3,60}$/.test(username)) {
  console.error("Usage: npm run create-admin -- <username>   (3 to 60 letters, digits, . _ -)");
  process.exit(1);
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => {
      if (text.includes(question)) rl.output.write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const password = process.env.ADMIN_PASSWORD || (await askHidden("Password (12+ characters): "));
if (password.length < 12) {
  console.error("Use at least 12 characters.");
  process.exit(1);
}
if (!process.env.ADMIN_PASSWORD && (await askHidden("Repeat password: ")) !== password) {
  console.error("Passwords do not match.");
  process.exit(1);
}

const db = await createDb(config.db);
const hash = await hashPassword(password);
const existing = await db.get("SELECT id FROM admins WHERE username = ?", [username]);
if (existing) {
  await db.run("UPDATE admins SET password_hash = ? WHERE id = ?", [hash, existing.id]);
  await db.run("DELETE FROM admin_sessions WHERE admin_id = ?", [existing.id]);
  console.log(`Password updated for "${username}". Existing sessions were signed out.`);
} else {
  await db.run("INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)", [username, hash, toSqlDateTime(new Date())]);
  console.log(`Admin "${username}" created.`);
}
await db.close();
