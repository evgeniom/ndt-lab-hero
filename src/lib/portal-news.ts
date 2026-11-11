export type NewsItem = { id: string; title: string; summary: string; url: string; source: string; date: string };

const links = (text: string) => [...text.matchAll(/(?<!!)\[([^\[\]\n]+)\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g)];

export function ndtIssueUrl(markdown: string): string {
  for (const match of links(markdown)) {
    if (!match[1] || !match[2]) continue;
    const url = new URL(match[2]);
    if (url.hostname === "www.ndt.net" && match[1].replace(/\*/g, "").trim() === "News" && url.searchParams.get("DocGroup") === "2") return url.href;
  }
  throw new Error("NDT.net news issue link not found");
}

export function parseNews(markdown: string, source: "ISO" | "NDT.net"): NewsItem[] {
  const out = new Map<string, NewsItem>();
  for (const match of links(markdown)) {
    if (!match[1] || !match[2]) continue;
    const url = new URL(match[2]);
    const valid = source === "ISO"
      ? url.hostname === "www.iso.org" && /^\/news\/\d{4}\/\d{2}\//.test(url.pathname)
      : url.hostname === "www.ndt.net" && /^\/search\/docs\.php3?$/.test(url.pathname) && /^\d+$/.test(url.searchParams.get("id") ?? "");
    const title = match[1].replace(/\*/g, "").trim();
    if (!valid || title.length < 12 || out.has(url.href)) continue;
    let date = "";
    if (source === "ISO") {
      const before = markdown.slice(0, match.index);
      const value = before.match(/(\d{1,2} [A-Za-z]+ \d{4})\s*$/)?.[1];
      if (value) {
        const parsed = new Date(`${value} 00:00:00 GMT`);
        if (Number.isFinite(+parsed)) date = parsed.toISOString();
      }
    } else {
      const row = markdown.slice(match.index, markdown.indexOf("\n", match.index) < 0 ? undefined : markdown.indexOf("\n", match.index));
      const value = row.match(/Date%20published%3A%20(\d{4}-\d{2}-\d{2})/i)?.[1];
      if (value) date = `${value}T00:00:00.000Z`;
    }
    out.set(url.href, { id: url.href, title, summary: "", url: url.href, source, date });
  }
  return [...out.values()].slice(0, 6);
}

export function mergeNews(groups: NewsItem[][]): NewsItem[] {
  return [...new Map(groups.flat().map(item => [item.url, item])).values()]
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
}