/**
 * Server-side academic reference search aggregator.
 * Calls OpenAlex, CrossRef, arXiv, and DOAJ in parallel — no API keys needed.
 */

export type Reference = {
  source: "openalex" | "crossref" | "arxiv" | "doaj";
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
  abstract?: string;
  doi?: string;
  url?: string;
  citations_count?: number;
};

export type SearchFilters = {
  yearFrom?: number;
  yearTo?: number;
  language?: string;
  limit?: number;
};

const UA = "ScholarBot/1.0 (academic reference search)";

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": UA, Accept: "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

function inYear(y: number | undefined, f?: number, t?: number) {
  if (!y) return true;
  if (f && y < f) return false;
  if (t && y > t) return false;
  return true;
}

async function searchOpenAlex(q: string, f: SearchFilters): Promise<Reference[]> {
  const params = new URLSearchParams({ search: q, per_page: String(f.limit ?? 10) });
  const filt: string[] = [];
  if (f.yearFrom) filt.push(`from_publication_date:${f.yearFrom}-01-01`);
  if (f.yearTo) filt.push(`to_publication_date:${f.yearTo}-12-31`);
  if (f.language) filt.push(`language:${f.language}`);
  if (filt.length) params.set("filter", filt.join(","));
  try {
    const data = await fetchJson(`https://api.openalex.org/works?${params}`);
    return (data.results || []).map((w: any): Reference => ({
      source: "openalex",
      title: w.title || "Tanpa judul",
      authors: (w.authorships || []).map((a: any) => a.author?.display_name).filter(Boolean),
      year: w.publication_year,
      venue: w.primary_location?.source?.display_name,
      abstract: w.abstract_inverted_index ? invertedToText(w.abstract_inverted_index) : undefined,
      doi: w.doi?.replace("https://doi.org/", ""),
      url: w.doi || w.primary_location?.landing_page_url,
      citations_count: w.cited_by_count,
    }));
  } catch (e) {
    console.error("OpenAlex error", e);
    return [];
  }
}

function invertedToText(inv: Record<string, number[]>): string {
  const arr: string[] = [];
  for (const [w, positions] of Object.entries(inv)) {
    for (const p of positions) arr[p] = w;
  }
  return arr.filter(Boolean).join(" ");
}

async function searchCrossRef(q: string, f: SearchFilters): Promise<Reference[]> {
  const params = new URLSearchParams({ query: q, rows: String(f.limit ?? 10) });
  if (f.yearFrom || f.yearTo) {
    const parts: string[] = [];
    if (f.yearFrom) parts.push(`from-pub-date:${f.yearFrom}`);
    if (f.yearTo) parts.push(`until-pub-date:${f.yearTo}`);
    params.set("filter", parts.join(","));
  }
  try {
    const data = await fetchJson(`https://api.crossref.org/works?${params}`);
    return (data.message?.items || []).map((w: any): Reference => ({
      source: "crossref",
      title: Array.isArray(w.title) ? w.title[0] : w.title || "Tanpa judul",
      authors: (w.author || []).map((a: any) => `${a.given ?? ""} ${a.family ?? ""}`.trim()).filter(Boolean),
      year: w.issued?.["date-parts"]?.[0]?.[0],
      venue: Array.isArray(w["container-title"]) ? w["container-title"][0] : w["container-title"],
      abstract: w.abstract?.replace(/<[^>]+>/g, ""),
      doi: w.DOI,
      url: w.URL,
      citations_count: w["is-referenced-by-count"],
    }));
  } catch (e) {
    console.error("CrossRef error", e);
    return [];
  }
}

async function searchArxiv(q: string, f: SearchFilters): Promise<Reference[]> {
  const params = new URLSearchParams({
    search_query: `all:${q}`,
    max_results: String(f.limit ?? 10),
    sortBy: "relevance",
    sortOrder: "descending",
  });
  try {
    const xml = await fetchText(`https://export.arxiv.org/api/query?${params}`);
    const entries = xml.split("<entry>").slice(1).map((e) => "<entry>" + e.split("</entry>")[0] + "</entry>");
    const refs: Reference[] = [];
    for (const e of entries) {
      const get = (tag: string) => e.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1]?.trim();
      const authors = [...e.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) => m[1].trim());
      const url = e.match(/<id>([^<]+)<\/id>/)?.[1]?.trim();
      const published = get("published");
      refs.push({
        source: "arxiv",
        title: get("title")?.replace(/\s+/g, " ") || "Tanpa judul",
        authors,
        year: published ? new Date(published).getFullYear() : undefined,
        venue: "arXiv",
        abstract: get("summary")?.replace(/\s+/g, " "),
        url,
      });
    }
    return refs.filter((r) => inYear(r.year, f.yearFrom, f.yearTo));
  } catch (e) {
    console.error("arXiv error", e);
    return [];
  }
}

async function searchDOAJ(q: string, f: SearchFilters): Promise<Reference[]> {
  try {
    const limit = f.limit ?? 10;
    const data = await fetchJson(
      `https://doaj.org/api/search/articles/${encodeURIComponent(q)}?pageSize=${limit}`,
    );
    return (data.results || []).map((r: any): Reference => {
      const b = r.bibjson || {};
      return {
        source: "doaj",
        title: b.title || "Tanpa judul",
        authors: (b.author || []).map((a: any) => a.name).filter(Boolean),
        year: b.year ? parseInt(b.year, 10) : undefined,
        venue: b.journal?.title,
        abstract: b.abstract,
        doi: (b.identifier || []).find((i: any) => i.type === "doi")?.id,
        url: (b.link || [])[0]?.url,
      };
    }).filter((r: Reference) => inYear(r.year, f.yearFrom, f.yearTo));
  } catch (e) {
    console.error("DOAJ error", e);
    return [];
  }
}

function dedupe(refs: Reference[]): Reference[] {
  const seen = new Map<string, Reference>();
  for (const r of refs) {
    const key = (r.doi || r.title).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
    const existing = seen.get(key);
    if (!existing || (r.citations_count ?? 0) > (existing.citations_count ?? 0)) {
      seen.set(key, r);
    }
  }
  return [...seen.values()];
}

export async function searchAllSources(query: string, filters: SearchFilters = {}): Promise<Reference[]> {
  const limit = filters.limit ?? 8;
  const [a, b, c, d] = await Promise.all([
    searchOpenAlex(query, { ...filters, limit }),
    searchCrossRef(query, { ...filters, limit }),
    searchArxiv(query, { ...filters, limit }),
    searchDOAJ(query, { ...filters, limit }),
  ]);
  const merged = dedupe([...a, ...b, ...c, ...d]);
  merged.sort((x, y) => (y.citations_count ?? 0) - (x.citations_count ?? 0));
  return merged.slice(0, 20);
}
