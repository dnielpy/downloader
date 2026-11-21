// How a call is sent to JDownloader's local API, shared by the server proxy and its tests.

/** Namespaces the proxy lets through; anything else is refused. */
export const NAMESPACES = new Set([
  "accountsV2",
  "captcha",
  "config",
  "downloadcontroller",
  "downloadsV2",
  "extraction",
  "jd",
  "linkcrawler",
  "linkgrabberv2",
  "reconnect",
  "system",
  "toolbar",
  "update",
]);

const PATH = /^([A-Za-z0-9]+)\/([A-Za-z0-9]+)$/;

/** Whether a path like "downloadsV2/queryLinks" is one the proxy forwards. */
export function isAllowedPath(path: string): boolean {
  const match = PATH.exec(path);
  return match !== null && NAMESPACES.has(match[1]);
}

/**
 * The URL of a call: the parameters go positionally in the query string, each one JSON-encoded,
 * in the order the API documents (e.g. /downloadsV2/setEnabled?true&[1,2]&[]).
 */
export function buildCallUrl(base: string, path: string, params: unknown[]): string {
  const query = params.map((param) => encodeURIComponent(JSON.stringify(param ?? null))).join("&");
  return `${base.replace(/\/+$/, "")}/${path}${query ? `?${query}` : ""}`;
}

/** The answer of a call: JDownloader wraps it as {"data": …} (with a request id), or sends it bare. */
export function unwrap(body: unknown): unknown {
  if (body !== null && typeof body === "object" && !Array.isArray(body) && "data" in body) {
    const keys = Object.keys(body);
    if (keys.every((key) => key === "data" || key === "rid")) {
      return (body as { data: unknown }).data;
    }
  }
  return body;
}

/** The message of an error answer ({"type": "BAD_PARAMETERS", "data": …} or plain text). */
export function errorMessage(status: number, text: string): string {
  try {
    const body = JSON.parse(text) as { type?: string; data?: unknown; message?: string };
    const detail = typeof body.data === "string" ? body.data : body.message;
    if (body.type) return detail ? `${body.type}: ${detail}` : body.type;
  } catch {
    // not JSON
  }
  return text.trim().slice(0, 300) || `HTTP ${status}`;
}
