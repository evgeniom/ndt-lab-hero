import { mergeNews, ndtIssueUrl, parseNews, type NewsItem } from "./portal-news";

const REFRESH_MS = 3 * 3600_000;
const RETRY_MS = 10 * 60_000;
const sources = ["ISO", "NDT.net"] as const;
const cache = new Map<string, { at: number; items: NewsItem[] }>();
const pending = new Map<string, Promise<NewsItem[]>>();

async function scrape(url: string): Promise<string> {
  const key = process.env["FIRECRAWL_API_KEY"];
  const gatewayKey = process.env["LOVABLE_API_KEY"];
  if (!key || !gatewayKey) throw new Error("News connection is not configured");
  const response = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${gatewayKey}`, "X-Connection-Api-Key": key },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, maxAge: REFRESH_MS }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const body = await response.text();
    console.error(`News scrape failed [${response.status}]: ${body}`);
    throw new Error(`News provider failed [${response.status}]: ${body}`);
  }
  const result = await response.json() as { success: boolean; error?: string; data?: { markdown?: string } };
  if (!result.success || !result.data?.markdown) throw new Error(result.error ?? "News source returned no content");
  return result.data.markdown;
}

async function readSource(source: typeof sources[number]): Promise<NewsItem[]> {
  const existing = cache.get(source);
  if (existing && Date.now() < existing.at) return existing.items;
  const running = pending.get(source);
  if (running) return running;
  const job = (async () => {
    try {
      const index = await scrape(source === "ISO" ? "https://www.iso.org/news.html" : "https://www.ndt.net/");
      const markdown = source === "ISO" ? index : await scrape(ndtIssueUrl(index));
      const items = parseNews(markdown, source);
      if (!items.length) throw new Error(`${source} returned no news articles`);
      cache.set(source, { at: Date.now() + REFRESH_MS, items });
      return items;
    } catch (error) {
      console.error(`Automatic news unavailable (${source})`, error);
      const items = existing?.items ?? [];
      cache.set(source, { at: Date.now() + RETRY_MS, items });
      return items;
    }
  })();
  pending.set(source, job);
  try { return await job; } finally { pending.delete(source); }
}

export async function readAutomaticNews(): Promise<NewsItem[]> {
  return mergeNews(await Promise.all(sources.map(readSource)));
}