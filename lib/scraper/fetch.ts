// Fetches a single HTML page with a timeout and basic safety checks.

export interface FetchedPage {
  url: string;
  html: string;
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; MoKnowledgeBot/0.1; +https://example.com/bot)";

const TIMEOUT_MS = 15000;
const MAX_BYTES = 2_000_000; // 2 MB cap so a huge page can't exhaust memory

export async function fetchPage(url: string): Promise<FetchedPage | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("text/html")) return null;

    const reader = res.body?.getReader();
    if (!reader) return null;

    let received = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }

    const html = new TextDecoder("utf-8").decode(Buffer.concat(chunks));
    return { url: res.url || url, html };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
