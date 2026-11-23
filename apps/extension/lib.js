// Settings and the call to the downloader, shared by the service worker and the options page.

export const DEFAULTS = {
  serverUrl: "http://192.168.20.188:3008",
  enabled: true,
  autostart: false,
  // One host per line; subdomains are excluded too
  excludedHosts: "",
};

export async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  return { ...stored, serverUrl: normalizeServerUrl(stored.serverUrl) };
}

export function normalizeServerUrl(url) {
  return String(url ?? "")
    .trim()
    .replace(/\/+$/, "");
}

/** Calls JDownloader through the web's proxy (/api/jd), the same way the web does. */
export async function jd(serverUrl, path, ...params) {
  let response;
  try {
    response = await fetch(`${serverUrl}/api/jd`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, params }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error("No hay conexión con el descargador");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      body.offline ? "JDownloader no está disponible" : (body.error ?? `HTTP ${response.status}`),
    );
  }
  return body.data;
}

/** Adds a link to the linkgrabber. */
export function addLink(settings, url, sourceUrl) {
  return jd(settings.serverUrl, "linkgrabberv2/addLinks", {
    links: url,
    sourceUrl: sourceUrl || undefined,
    autostart: settings.autostart,
    assignJobID: true,
  });
}

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** Whether a download is left to Chrome instead of being sent to the downloader. */
export function skipReason(settings, url) {
  if (!/^(https?|ftp):/i.test(url)) return "not a web URL";
  const host = hostOf(url);
  // Files served by the downloader itself would loop back to it
  if (host && host === hostOf(settings.serverUrl)) return "the downloader's own host";
  const excluded = settings.excludedHosts
    .split(/\s+/)
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (excluded.some((h) => host === h || host.endsWith(`.${h}`))) return "excluded host";
  return null;
}
