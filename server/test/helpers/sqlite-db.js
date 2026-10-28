import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// An in-memory stand-in for the MySQL wrapper, used only by the tests.
// The app's SQL is kept portable, so only two small translations are needed:
// "INSERT IGNORE" becomes "INSERT OR IGNORE", and schema.sql loses its MySQL-only syntax.

const here = dirname(fileURLToPath(import.meta.url));

export function mysqlSchemaToSqlite(sql) {
  const statements = sql
    .replace(/^\s*--.*$/gm, "")
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter(Boolean);

  const output = [];
  for (let statement of statements) {
    const table = /CREATE TABLE IF NOT EXISTS (\w+)/.exec(statement)[1];
    const indexes = [];
    statement = statement
      .replace(/\)\s*ENGINE=[\s\S]*$/, ")")
      .replace(/(?:BIG)?INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY/g, "INTEGER PRIMARY KEY AUTOINCREMENT")
      .replace(/^\s*INDEX\s+(\w+)\s*\(([^)]+)\)\s*,?\s*$/gm, (_, name, columns) => {
        indexes.push(`CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${columns})`);
        return "";
      })
      .replace(/,(\s*)\)\s*$/, "$1)");
    output.push(statement, ...indexes);
  }
  return output;
}

export function createSqliteDb() {
  const sqlite = new DatabaseSync(":memory:");
  for (const statement of mysqlSchemaToSqlite(readFileSync(join(here, "../../sql/schema.sql"), "utf8"))) {
    sqlite.exec(statement);
  }

  const translate = (sql) => sql.replace(/INSERT IGNORE/g, "INSERT OR IGNORE");
  return {
    async all(sql, params = []) {
      return sqlite.prepare(translate(sql)).all(...params);
    },
    async get(sql, params = []) {
      return sqlite.prepare(translate(sql)).get(...params) ?? null;
    },
    async run(sql, params = []) {
      const result = sqlite.prepare(translate(sql)).run(...params);
      return { insertId: Number(result.lastInsertRowid), affectedRows: result.changes };
    },
    async close() {
      sqlite.close();
    },
  };
}
