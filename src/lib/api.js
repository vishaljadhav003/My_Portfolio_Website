// Small helpers for talking to the Node server in /server.

const VISITOR_KEY = "vj-visitor";
const VISITOR_PATTERN = /^[A-Za-z0-9-]{16,64}$/;
let memoryId = "";

function makeId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** A random id kept in this browser. It is not tied to a name or an IP address. */
export function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!VISITOR_PATTERN.test(id || "")) {
      id = makeId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch (error) {
    memoryId = memoryId || makeId();
    return memoryId;
  }
}

export class ApiError extends Error {
  constructor(status, data) {
    super((data && (data.error || data.message)) || "Request failed");
    this.status = status;
    this.data = data || {};
  }
}

/** JSON request. Throws ApiError for any non-2xx answer. */
export async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: { "x-requested-with": "fetch", ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    /* 204 and empty bodies have nothing to parse */
  }
  if (!response.ok) throw new ApiError(response.status, data);
  return data;
}

/** Fire-and-forget request for tracking. Never throws and survives page unload. */
export function ping(path, body) {
  try {
    fetch(path, {
      method: "POST",
      keepalive: true,
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visitorId: visitorId(), ...body }),
    }).catch(() => {});
  } catch (error) {
    /* tracking must never break the page */
  }
}
