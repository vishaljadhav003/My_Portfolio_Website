import { test } from "node:test";
import assert from "node:assert/strict";
import { createSession, destroySession, findSession, hashPassword, purgeExpiredSessions, verifyPassword } from "../src/auth.js";
import { createSqliteDb } from "./helpers/sqlite-db.js";

test("password hashes verify, differ per call, and reject wrong passwords", async () => {
  const one = await hashPassword("a very long passphrase");
  const two = await hashPassword("a very long passphrase");
  assert.notEqual(one, two);
  assert.match(one, /^scrypt\$32768\$8\$1\$/);
  assert.ok(await verifyPassword("a very long passphrase", one));
  assert.ok(!(await verifyPassword("a very long passphrasE", one)));
});

test("malformed stored hashes never verify", async () => {
  for (const stored of ["", "plain", "scrypt$1$2", "bcrypt$a$b$c$d$e", null]) {
    assert.equal(await verifyPassword("x", stored), false);
  }
});

test("sessions store only a hash, expire, and can be destroyed", async () => {
  const db = createSqliteDb();
  const start = new Date("2026-10-26T06:00:00Z");
  await db.run("INSERT INTO admins (username, password_hash, created_at) VALUES ('a', 'h', '2026-10-26 06:00:00')");

  const token = await createSession(db, 1, 12, start);
  const stored = await db.get("SELECT token_hash FROM admin_sessions");
  assert.notEqual(stored.token_hash, token);
  assert.equal(stored.token_hash.length, 64);

  assert.equal((await findSession(db, token, new Date(start.getTime() + 3_600_000))).username, "a");
  assert.equal(await findSession(db, token, new Date(start.getTime() + 13 * 3_600_000)), null);
  assert.equal(await findSession(db, "nope", start), null);

  await purgeExpiredSessions(db, new Date(start.getTime() + 13 * 3_600_000));
  assert.equal((await db.get("SELECT COUNT(*) AS n FROM admin_sessions")).n, 0);

  const second = await createSession(db, 1, 12, start);
  await destroySession(db, second);
  assert.equal(await findSession(db, second, start), null);
});
