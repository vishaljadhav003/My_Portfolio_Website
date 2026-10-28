// Creates the database if it is missing, then all tables. Safe to run again.
import { readFile } from "node:fs/promises";
import { config, schemaFile } from "./_env.js";
import { createDb } from "../src/db.js";

if (!/^\w+$/.test(config.db.database)) throw new Error("DB_NAME may only contain letters, numbers and underscores.");
const { default: mysql } = await import("mysql2/promise");
const { database, ...server } = config.db;
try {
  const connection = await mysql.createConnection(server);
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();
} catch (error) {
  console.error(`Could not connect to MySQL at ${server.host}:${server.port} as "${server.user}": ${error.code || error.message}`);
  console.error("Check that MySQL is running and that DB_USER and DB_PASSWORD in server/.env are correct.");
  process.exit(1);
}

const db = await createDb(config.db);
const statements = (await readFile(schemaFile, "utf8"))
  .split(/;\s*\n/)
  .map((statement) => statement.replace(/^\s*--.*$/gm, "").trim())
  .filter(Boolean);

for (const statement of statements) await db.run(statement);
console.log(`Database "${config.db.database}" is ready (${statements.length} tables).`);
await db.close();
