export type CitationRef = {
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
  doi?: string;
  url?: string;
};

function authorsAPA(authors: string[]): string {
  if (!authors.length) return "Anonim";
  return authors
    .map((a) => {
      const parts = a.trim().split(/\s+/);
      const last = parts.pop() || a;
      const initials = parts.map((p) => p[0]?.toUpperCase() + ".").join(" ");
      return `${last}, ${initials}`.trim();
    })
    .join(", ");
}

export function formatCitation(ref: CitationRef, format: "apa" | "ieee" | "vancouver" | "bibtex"): string {
  const a = ref.authors.length ? ref.authors : ["Anonim"];
  const y = ref.year ?? "n.d.";
  const t = ref.title;
  const v = ref.venue ?? "";
  const doi = ref.doi ? ` https://doi.org/${ref.doi}` : ref.url ? ` ${ref.url}` : "";

  switch (format) {
    case "apa":
      return `${authorsAPA(a)} (${y}). ${t}. ${v ? `${v}.` : ""}${doi}`.trim();
    case "ieee":
      return `${a.join(", ")}, "${t}," ${v}, ${y}.${doi}`.trim();
    case "vancouver":
      return `${a.join(", ")}. ${t}. ${v}. ${y}.${doi}`.trim();
    case "bibtex": {
      const key = (a[0]?.split(/\s+/).pop() || "ref").toLowerCase() + (ref.year ?? "");
      return `@article{${key},
  title   = {${t}},
  author  = {${a.join(" and ")}},
  year    = {${ref.year ?? ""}},
  journal = {${v}},
  doi     = {${ref.doi ?? ""}},
  url     = {${ref.url ?? ""}}
}`;
    }
  }
}
