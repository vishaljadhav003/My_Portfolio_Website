import { test } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter, buildCsp, cleanLine, cleanPath, deviceFrom, isBot, referrerHost, validateInquiry } from "../src/security.js";
import { mysqlSchemaToSqlite } from "./helpers/sqlite-db.js";
import { readFileSync } from "node:fs";

const good = { name: "Asha Patil", email: "Asha@Example.com", phone: "+91 98765-43210", service: "ai", message: "Need an assistant for my site." };

test("a valid inquiry is cleaned and accepted", () => {
  const { value, errors } = validateInquiry(good);
  assert.deepEqual(errors, {});
  assert.equal(value.email, "asha@example.com");
  assert.equal(value.phone, "+919876543210");
});

test("every bad field is reported", () => {
  const { errors } = validateInquiry({ name: "A", email: "not-an-email", phone: "12", service: "hack", message: "short" });
  assert.deepEqual(Object.keys(errors).sort(), ["email", "message", "name", "phone", "service"]);
});

test("header injection in names and emails is rejected or flattened", () => {
  const { value, errors } = validateInquiry({ ...good, name: "Eve\r\nBcc: x@y.com", email: "a@b.com\r\nBcc: x@y.com" });
  assert.ok(errors.email);
  assert.ok(!/[\r\n]/.test(value.name));
});

test("non-string input never throws", () => {
  const { errors } = validateInquiry({ name: { a: 1 }, email: 5, phone: null, service: [], message: undefined });
  assert.equal(Object.keys(errors).length, 5);
});

test("cleanLine strips control characters and caps length", () => {
  assert.equal(cleanLine("a\u0000b\n c", 10), "ab c");
  assert.equal(cleanLine("x".repeat(500), 20).length, 20);
});

test("paths lose queries and cannot become protocol-relative URLs", () => {
  assert.equal(cleanPath("/projects?utm=1#top"), "/projects");
  assert.equal(cleanPath("//evil.com/x"), "/");
  assert.equal(cleanPath("javascript:alert(1)"), "/");
});

test("referrer is reduced to a host and dropped for the own site", () => {
  assert.equal(referrerHost("https://www.google.com/search?q=vishal", "mysite.com"), "google.com");
  assert.equal(referrerHost("https://mysite.com/about", "mysite.com"), null);
  assert.equal(referrerHost("garbage", "mysite.com"), null);
});

test("device and bot detection", () => {
  assert.equal(deviceFrom("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148"), "mobile");
  assert.equal(deviceFrom("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"), "tablet");
  assert.equal(deviceFrom("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari"), "mobile");
  assert.equal(deviceFrom("Mozilla/5.0 (Windows NT 10.0; Win64) Chrome/120"), "desktop");
  assert.ok(isBot("Googlebot/2.1"));
  assert.ok(!isBot("Mozilla/5.0 (Windows NT 10.0) Chrome/120"));
});

test("rate limiter blocks after the limit and recovers after the window", () => {
  let time = 0;
  const limiter = new RateLimiter(() => time);
  for (let i = 0; i < 3; i++) assert.ok(limiter.hit("k", 3, 1000).ok);
  const blocked = limiter.hit("k", 3, 1000);
  assert.ok(!blocked.ok);
  assert.equal(blocked.retryAfter, 1);
  time = 1001;
  assert.ok(limiter.hit("k", 3, 1000).ok);
  limiter.close();
});

test("CSP allows only listed inline scripts and forbids framing", () => {
  const csp = buildCsp({ scriptHashes: ["abc="] });
  assert.match(csp, /script-src 'self' 'wasm-unsafe-eval' 'sha256-abc='/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.ok(!/script-src[^;]*unsafe-inline/.test(csp));
});

test("schema.sql translates for the sqlite test database (every table, indexes extracted)", () => {
  const statements = mysqlSchemaToSqlite(readFileSync(new URL("../sql/schema.sql", import.meta.url), "utf8"));
  assert.equal(statements.filter((s) => s.startsWith("CREATE TABLE")).length, 10);
  assert.ok(statements.some((s) => s.startsWith("CREATE INDEX")));
  assert.ok(!statements.some((s) => /ENGINE|AUTO_INCREMENT/.test(s)));
});
