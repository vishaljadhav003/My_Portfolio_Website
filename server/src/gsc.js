import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dayKey } from "./time.js";

// Pulls daily Search Console numbers (how often the site showed in Google, and how often it was clicked)
// into the search_stats table. Needs a service account that was added as a user on the property.

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const base64url = (input) => Buffer.from(input).toString("base64url");

export function signServiceJwt(account, now = Date.now()) {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const issued = Math.floor(now / 1000);
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: SCOPE,
      aud: account.token_uri || "https://oauth2.googleapis.com/token",
      iat: issued,
      exp: issued + 3000,
    })
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(account.private_key, "base64url");
  return `${header}.${claims}.${signature}`;
}

async function accessToken(account, fetchImpl) {
  const response = await fetchImpl(account.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signServiceJwt(account),
    }),
  });
  if (!response.ok) throw new Error(`Google token request failed (${response.status})`);
  return (await response.json()).access_token;
}

export async function syncSearchStats({ config, db, fetchImpl = fetch, now = new Date(), days = 30 }) {
  if (!config.gsc.keyFile || !config.gsc.siteUrl) {
    throw new Error("Search Console is not configured. Set GSC_SERVICE_ACCOUNT_FILE and GSC_SITE_URL.");
  }
  const account = JSON.parse(await readFile(config.gsc.keyFile, "utf8"));
  const token = await accessToken(account, fetchImpl);

  // Search Console data is final after about two days, so end two days ago.
  const end = dayKey(new Date(now.getTime() - 2 * 86_400_000));
  const start = dayKey(new Date(now.getTime() - (days + 2) * 86_400_000));

  const response = await fetchImpl(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(config.gsc.siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ startDate: start, endDate: end, dimensions: ["date"], rowLimit: 100 }),
    }
  );
  if (!response.ok) throw new Error(`Search Console request failed (${response.status})`);
  const { rows = [] } = await response.json();

  for (const row of rows) {
    const values = [Math.round(row.impressions), Math.round(row.clicks), row.position];
    const existing = await db.get("SELECT day FROM search_stats WHERE day = ?", [row.keys[0]]);
    if (existing) {
      await db.run("UPDATE search_stats SET impressions = ?, clicks = ?, position = ? WHERE day = ?", [...values, row.keys[0]]);
    } else {
      await db.run("INSERT INTO search_stats (day, impressions, clicks, position) VALUES (?, ?, ?, ?)", [row.keys[0], ...values]);
    }
  }
  return rows.length;
}
