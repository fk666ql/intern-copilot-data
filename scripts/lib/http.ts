export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 2,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (response.ok || (response.status >= 400 && response.status < 500)) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < retries) await sleep(800 * 2 ** attempt);
  }
  throw lastError instanceof Error ? lastError : new Error("fetch failed");
}
