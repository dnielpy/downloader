/** A failed call. `offline` means JDownloader itself could not be reached (starting, restarting, updating). */
export class JdError extends Error {
  constructor(
    message: string,
    readonly offline = false,
  ) {
    super(message);
    this.name = "JdError";
  }
}

/** Calls JDownloader through the web's server: jd("downloadsV2/setEnabled", true, [1], []). */
export async function jd<T = unknown>(path: string, ...params: unknown[]): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api/jd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, params }),
    });
  } catch {
    throw new JdError("No hay conexión con el servidor", true);
  }
  const body = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: string;
    offline?: boolean;
  };
  if (!response.ok) {
    throw new JdError(body.error ?? `HTTP ${response.status}`, body.offline ?? false);
  }
  return body.data as T;
}
