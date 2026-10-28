import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { sha256 } from "./security.js";
import { toSqlDateTime } from "./time.js";

const scryptAsync = promisify(scrypt);

const N = 32768;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const OPTIONS = { N, r: R, p: P, maxmem: 128 * N * R * 2 };

/** "scrypt$N$r$p$salt$hash". Safe to store in the admins table. */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH, OPTIONS);
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password, stored) {
  const parts = String(stored).split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, "base64");
  const options = { N: Number(n), r: Number(r), p: Number(p), maxmem: 128 * Number(n) * Number(r) * 2 };
  const actual = await scryptAsync(password, Buffer.from(salt, "base64"), expected.length, options);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Used when the username does not exist, so a wrong user and a wrong password take the same time.
let decoyHash;
export async function burnTime(password) {
  decoyHash ??= await hashPassword("decoy-password-for-timing");
  await verifyPassword(password, decoyHash);
}

// ---------- Sessions ----------

/** Creates a session and returns the raw token. Only its SHA-256 is stored. */
export async function createSession(db, adminId, hours, now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(now.getTime() + hours * 3_600_000);
  await db.run("INSERT INTO admin_sessions (token_hash, admin_id, created_at, expires_at) VALUES (?, ?, ?, ?)", [
    sha256(token),
    adminId,
    toSqlDateTime(now),
    toSqlDateTime(expires),
  ]);
  return token;
}

export async function findSession(db, token, now = new Date()) {
  if (!token || token.length > 100) return null;
  return db.get(
    `SELECT a.id, a.username
       FROM admin_sessions s
       JOIN admins a ON a.id = s.admin_id
      WHERE s.token_hash = ? AND s.expires_at > ?`,
    [sha256(token), toSqlDateTime(now)]
  );
}

export async function destroySession(db, token) {
  if (token) await db.run("DELETE FROM admin_sessions WHERE token_hash = ?", [sha256(token)]);
}

export async function purgeExpiredSessions(db, now = new Date()) {
  await db.run("DELETE FROM admin_sessions WHERE expires_at <= ?", [toSqlDateTime(now)]);
}
