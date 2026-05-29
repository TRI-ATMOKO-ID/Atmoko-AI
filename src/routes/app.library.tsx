import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReferenceCard } from "@/components/reference-card";
import { Input } from "@/components/ui/input";
import { Library, Search } from "lucide-react";
import type { Reference } from "@/lib/search.server";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/library")({
  head: () => ({ meta: [{ title: "Perpustakaan — ScholarBot" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: items } = useQuery({
    queryKey: ["saved_refs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_references")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const remove = async (id: string) => {
    const { error } = await supabase.from("saved_references").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["saved_refs"] }); }
  };

  const filtered = (items ?? []).filter((r) =>
    !q || r.title.toLowerCase().includes(q.toLowerCase()) ||
    (r.authors ?? []).some((a: string) => a.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Library className="w-6 h-6 text-accent" />
          <h1 className="font-serif text-3xl">Perpustakaan</h1>
        </div>

        <div className="relative mb-6">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Cari di koleksi Anda…"
            className="pl-9 bg-card border-border/60"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            {items?.length ? "Tidak ada yang cocok." : "Belum ada referensi tersimpan. Simpan dari hasil pencarian."}
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="relative group">
                <ReferenceCard reference={r as unknown as Reference} />
                <Button
                  size="icon" variant="ghost"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
                  onClick={() => remove(r.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
