import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookmarkPlus, Download, ExternalLink, Quote } from "lucide-react";
import { toast } from "sonner";
import { saveReference, exportCitation } from "@/lib/scholarbot.functions";
import type { Reference } from "@/lib/search.server";

const SOURCE_COLORS: Record<string, string> = {
  openalex: "bg-emerald-900/40 text-emerald-200 border-emerald-800",
  crossref: "bg-blue-900/40 text-blue-200 border-blue-800",
  arxiv: "bg-red-900/40 text-red-200 border-red-800",
  doaj: "bg-purple-900/40 text-purple-200 border-purple-800",
  scholar: "bg-yellow-900/40 text-yellow-200 border-yellow-800",
  sinta: "bg-pink-900/40 text-pink-200 border-pink-800",
};

export function ReferenceCard({ reference, index }: { reference: Reference; index?: number }) {
  const save = useServerFn(saveReference);
  const exp = useServerFn(exportCitation);
  const [busy, setBusy] = useState(false);

  const onSave = async () => {
    setBusy(true);
    try {
      await save({ data: reference });
      toast.success("Referensi disimpan ke perpustakaan");
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  };

  const onExport = async (format: "apa" | "ieee" | "vancouver" | "bibtex") => {
    try {
      const { citation } = await exp({ data: { ref: reference, format } });
      await navigator.clipboard.writeText(citation);
      toast.success(`Sitasi ${format.toUpperCase()} disalin ke clipboard`);
    } catch {
      toast.error("Gagal mengekspor sitasi");
    }
  };

  return (
    <Card className="p-4 bg-card/80 border-border/60 hover:border-primary/40 transition">
      <div className="flex items-start gap-3">
        {typeof index === "number" && (
          <span className="font-serif text-accent text-sm pt-0.5 min-w-6">[{index + 1}]</span>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-base leading-snug text-foreground">{reference.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {reference.authors.slice(0, 4).join(", ")}
            {reference.authors.length > 4 ? ", et al." : ""}
            {reference.year ? ` · ${reference.year}` : ""}
            {reference.venue ? ` · ${reference.venue}` : ""}
          </p>
          {reference.abstract && (
            <p className="text-sm text-muted-foreground/90 mt-2 line-clamp-3">{reference.abstract}</p>
          )}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge variant="outline" className={SOURCE_COLORS[reference.source] ?? ""}>
              {reference.source}
            </Badge>
            {typeof reference.citations_count === "number" && (
              <Badge variant="outline" className="text-xs">
                <Quote className="w-3 h-3 mr-1" />
                {reference.citations_count}
              </Badge>
            )}
            <div className="flex-1" />
            {reference.url && (
              <Button asChild size="sm" variant="ghost" className="h-7">
                <a href={reference.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> Buka
                </a>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7">
                  <Download className="w-3.5 h-3.5 mr-1" /> Sitasi
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExport("apa")}>APA</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport("ieee")}>IEEE</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport("vancouver")}>Vancouver</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport("bibtex")}>BibTeX</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="secondary" className="h-7" disabled={busy} onClick={onSave}>
              <BookmarkPlus className="w-3.5 h-3.5 mr-1" /> Simpan
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
