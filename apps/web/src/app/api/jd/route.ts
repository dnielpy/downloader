import { buildCallUrl, errorMessage, isAllowedPath, unwrap } from "@/lib/jd/request";

// JDownloader's API, only reachable from the server (it has no auth). The browser posts {path, params} here.
const JD_API_URL = process.env.JD_API_URL ?? "http://localhost:3128";

// Long enough for slow calls like a link check, short of hanging the page forever
const TIMEOUT_MS = 30_000;

export async function POST(request: Request) {
  let body: { path?: unknown; params?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { path, params = [] } = body;
  if (typeof path !== "string" || !isAllowedPath(path) || !Array.isArray(params)) {
    return Response.json({ error: "Call not allowed" }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(buildCallUrl(JD_API_URL, path, params), {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // Not started yet, restarting or updating
    return Response.json({ error: "JDownloader is not reachable", offline: true }, { status: 503 });
  }

  const text = await response.text();
  if (!response.ok) {
    return Response.json({ error: errorMessage(response.status, text) }, { status: 502 });
  }
  if (!text) return Response.json({ data: null });
  try {
    return Response.json({ data: unwrap(JSON.parse(text)) });
  } catch {
    // A few calls answer plain text
    return Response.json({ data: text });
  }
}
