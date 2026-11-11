import { describe, expect, it } from "vitest";
import { mergeNews, ndtIssueUrl, parseNews } from "./portal-news";

describe("automatic portal news", () => {
  it("extracts ISO publications with their real dates, not navigation or images", () => {
    const items = parseNews('[Home](https://www.iso.org/home.html)\n[![](https://www.iso.org/image.jpg)](https://www.iso.org/news/2026/11/cop31)\n9 November 2026\n[International standards at COP31](https://www.iso.org/news/2026/11/cop31 "title")', "ISO");
    expect(items).toHaveLength(1);
    expect(items[0].date).toBe("2026-11-09T00:00:00.000Z");
    expect(items[0].source).toBe("ISO");
  });
  it("discovers the news issue dynamically from NDT.net", () => {
    expect(ndtIssueUrl('[**News**](https://www.ndt.net/search/docs.php3?MainSource=25&date=2026-12&DocGroup=2 "News")')).toContain("date=2026-12");
  });
  it("extracts NDT articles and publication dates without fabricating missing dates", () => {
    const items = parseNews('| [Digital radiography partnership](https://www.ndt.net/search/docs.php?id=35126)<br>[Email](mailto:?Date%20published%3A%202026-11-01) |\n[Undated ultrasonic research](https://www.ndt.net/search/docs.php?id=35127)', "NDT.net");
    expect(items[0].date).toBe("2026-11-01T00:00:00.000Z");
    expect(items[1].date).toBe("");
    expect(items[0].source).toBe("NDT.net");
  });
  it("combines only supplied automatic articles and removes duplicate URLs", () => {
    const iso = parseNews('9 November 2026\n[International standards at COP31](https://www.iso.org/news/2026/11/cop31)', "ISO");
    expect(mergeNews([iso, iso])).toHaveLength(1);
    expect(mergeNews([[], []])).toEqual([]);
  });
});